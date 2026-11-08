import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET } from "../app/.well-known/[...slug]/route";

const get = (path: string) =>
  GET(new Request(`https://www.esdeveniments.cat/.well-known/${path}`), {
    params: Promise.resolve({ slug: path.split("/") }),
  });

describe(".well-known agent discovery", () => {
  it("lists a skill whose digest matches the served SKILL.md", async () => {
    const index = await (await get("agent-skills/index.json")).json();
    const [skill] = index.skills;
    const skillPath = new URL(skill.url).pathname.replace("/.well-known/", "");

    const response = await get(skillPath);
    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(bytes.toString()).toMatch(new RegExp(`^---\\nname: ${skill.name}\\n`));
    expect(skill.digest).toBe(
      `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    );
  });

  it("serves an ARD manifest with valid entry identifiers", async () => {
    const manifest = await (await get("ard.json")).json();

    expect(manifest.entries.length).toBeGreaterThan(0);
    for (const entry of manifest.entries) {
      expect(entry.identifier).toMatch(
        /^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/,
      );
      expect(() => new URL(entry.url)).not.toThrow();
    }
  });
});
