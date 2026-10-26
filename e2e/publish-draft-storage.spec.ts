import { test, expect } from "@playwright/test";
import { build } from "vite";
import { resolve } from "node:path";

let bundle = "";

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "error",
    define: {
      process: JSON.stringify({ env: {}, features: {} }),
      "process.env": "{}",
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    resolve: {
      alias: {
        "@utils": resolve("utils"),
        "@lib": resolve("lib"),
        types: resolve("types"),
        "next-intl/server": resolve("test/mocks/next-intl-server.ts"),
      },
    },
    build: {
      write: false,
      lib: { entry: resolve("utils/publish-draft-storage.ts"), formats: ["es"] },
    },
  });
  if (!("output" in result) && !Array.isArray(result)) throw new Error("Expected browser bundle");
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
  const chunk = outputs.find((output) => output.type === "chunk" && output.isEntry);
  if (!chunk || chunk.type !== "chunk") throw new Error("Storage module bundle missing");
  bundle = chunk.code;
});

// Serve only a test fixture and the real bundled module. IndexedDB and File are
// browser-native; no application route, auth gate or production test hook is added.
test.beforeEach(async ({ context, page }) => {
  await context.route("http://localhost:3000/**", (route) => route.fulfill({
    contentType: route.request().url().endsWith(".js") ? "text/javascript" : "text/html",
    body: route.request().url().endsWith(".js")
      ? bundle
      : "<!doctype html><title>Publish draft storage fixture</title><main>Native IndexedDB proof</main>",
  }));
  await page.goto("http://localhost:3000/");
});

test("recovers an actual PNG and exact File metadata after document reload", async ({ page }, testInfo) => {
  const saved = await page.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    canvas.getContext("2d")!.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG generation failed")), "image/png"));
    const imageFile = new File([blob], "synthetic-poster.png", { type: "image/png", lastModified: 123456789 });
    const bytes = Array.from(new Uint8Array(await imageFile.arrayBuffer()));
    const result = await storage.savePublishDraft({ kind: "guest" }, {
      form: { title: "", description: "unfinished", url: "https:/in-progress" }, imageFile,
    }, null);
    if (!result.ok) throw new Error(result.reason);
    return { bytes, revision: result.revision };
  });
  await page.reload();
  const recovered = await page.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    const result = await storage.loadPublishDraft({ kind: "guest" });
    if (!result.ok || result.status !== "found" || !result.draft.imageFile) {
      throw new Error("Image draft not recovered");
    }
    const file = result.draft.imageFile;
    const bitmap = await createImageBitmap(file);
    const dimensions = [bitmap.width, bitmap.height];
    bitmap.close();
    return {
      bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
      isFile: file instanceof File,
      name: file.name, type: file.type, lastModified: file.lastModified, size: file.size,
      dimensions, revision: result.revision, form: result.draft.form,
    };
  });
  expect(recovered).toEqual({
    bytes: saved.bytes, isFile: true, name: "synthetic-poster.png",
    type: "image/png", lastModified: 123456789, size: saved.bytes.length,
    dimensions: [2, 2], revision: saved.revision,
    form: { title: "", description: "unfinished", url: "https:/in-progress" },
  });
  await testInfo.attach("native-indexeddb-roundtrip", {
    contentType: "application/json",
    body: JSON.stringify({
      browser: testInfo.project.name, reload: true, exactBytes: true,
      byteCount: saved.bytes.length, name: recovered.name, type: recovered.type,
      lastModified: recovered.lastModified, decodedDimensions: recovered.dimensions,
    }),
  });
});

test("a second tab's discard fences a delayed image save, including after reload", async ({ context, page }) => {
  const pending = page.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    const file = new File(["pending"], "p.png", { type: "image/png" });
    const original = file.arrayBuffer.bind(file);
    file.arrayBuffer = () => new Promise((resolve) => {
      window.addEventListener("release-image", () => { void original().then(resolve); }, { once: true });
      document.body.dataset.preparing = "true";
    });
    return storage.savePublishDraft({ kind: "guest" }, { form: { title: "old" }, imageFile: file }, null);
  });
  await page.waitForFunction(() => document.body.dataset.preparing === "true");
  const other = await context.newPage();
  await other.goto("http://localhost:3000/");
  expect(await other.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    return storage.discardPublishDraft({ kind: "guest" }, null);
  })).toMatchObject({ ok: true });
  await page.evaluate(() => window.dispatchEvent(new Event("release-image")));
  expect(await pending).toEqual({ ok: false, reason: "stale" });
  await page.reload();
  expect(await page.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    return storage.loadPublishDraft({ kind: "guest" });
  })).toMatchObject({ ok: true, status: "empty" });
});

test("real transactions reject competing revisions and isolate guest/account payloads", async ({ context, page }) => {
  const other = await context.newPage();
  await other.goto("http://localhost:3000/");
  const write = async (target: typeof page, title: string) => target.evaluate(async (title) => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    return storage.savePublishDraft({ kind: "guest" }, { form: { title }, imageFile: null }, null);
  }, title);
  const results = await Promise.all([write(page, "tab-a"), write(other, "tab-b")]);
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "stale" }]);
  expect(await other.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    return storage.loadPublishDraft({ kind: "account", accountId: "different-account" });
  })).toMatchObject({ ok: true, status: "empty" });
});

test("explicit discard repairs a missing fence and rejects pre-recovery writes", async ({ page }) => {
  expect(await page.evaluate(async () => {
    const url = "/__publish-draft-storage.js";
    const storage: typeof import("../utils/publish-draft-storage") = await import(url);
    const owner = { kind: "guest" } as const;
    const saved = await storage.savePublishDraft(owner, { form: { title: "draft" }, imageFile: null }, null);
    if (!saved.ok) throw new Error(saved.reason);
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("esdeveniments-publish-drafts", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("metadata", "readwrite");
        tx.objectStore("metadata").delete("revision");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const invalid = await storage.loadPublishDraft(owner);
    const discarded = await storage.discardPublishDraft(owner, null);
    const stale = await storage.savePublishDraft(owner, { form: {}, imageFile: null }, saved.revision);
    return { invalid, discarded, stale, loaded: await storage.loadPublishDraft(owner) };
  })).toMatchObject({
    invalid: { ok: false, reason: "corrupt", revision: null },
    discarded: { ok: true },
    stale: { ok: false, reason: "stale" },
    loaded: { ok: true, status: "empty" },
  });
});
