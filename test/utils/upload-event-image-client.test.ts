import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { uploadImageWithProgress } from "@utils/upload-event-image-client";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

type Handler = (() => void) | null;

class FakeUpload {
  onprogress: ((ev: ProgressEvent<EventTarget>) => void) | null = null;
  triggerProgress(loaded: number, total: number) {
    this.onprogress?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }
}

class MockXHR {
  static requests: MockXHR[] = [];

  method = "";
  url = "";
  headers: Record<string, string> = {};
  responseType = "";
  response: unknown = "";
  status = 0;
  aborted = false;
  onload: Handler = null;
  onerror: Handler = null;
  ontimeout: Handler = null;
  upload = new FakeUpload();

  constructor() {
    MockXHR.requests.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key.toLowerCase()] = value;
  }

  send(_body?: unknown) {
    // noop; test will trigger events
  }

  abort() {
    this.aborted = true;
  }

  triggerLoad() {
    this.onload?.();
  }

  triggerError() {
    this.onerror?.();
  }

  triggerTimeout() {
    this.ontimeout?.();
  }
}

describe("uploadImageWithProgress", () => {
  const OriginalXHR = global.XMLHttpRequest;

  beforeEach(() => {
    MockXHR.requests = [];
    vi.useFakeTimers();
    // @ts-expect-error override for test
    global.XMLHttpRequest = MockXHR;
  });

  afterEach(() => {
    global.XMLHttpRequest = OriginalXHR;
    vi.useRealTimers();
  });

  it("resolves with url and publicId on success", async () => {
    const promise = uploadImageWithProgress(
      new File(["data"], "ok.jpg", { type: "image/jpeg" })
    );

    const req = MockXHR.requests[0];
    req.status = 200;
    req.response = JSON.stringify({
      url: "https://cdn.example.com/photo.jpg",
      publicId: "pid-123",
    });
    req.triggerLoad();

    await expect(promise).resolves.toEqual({
      url: "https://cdn.example.com/photo.jpg",
      publicId: "pid-123",
    });
  });

  it("retries once on 500 then succeeds", async () => {
    const promise = uploadImageWithProgress(
      new File(["data"], "retry.jpg", { type: "image/jpeg" })
    );

    // First attempt
    const first = MockXHR.requests[0];
    first.status = 500;
    first.response = "server error";
    first.triggerLoad();

    // Advance timers to allow retry to schedule
    await vi.runAllTimersAsync();

    // Second attempt
    const second = MockXHR.requests[1];
    second.status = 200;
    second.response = JSON.stringify({
      url: "https://cdn.example.com/retry.jpg",
      publicId: "pid-retry",
    });
    second.triggerLoad();

    await expect(promise).resolves.toEqual({
      url: "https://cdn.example.com/retry.jpg",
      publicId: "pid-retry",
    });
  });

  it("rejects with AbortError when aborted", async () => {
    const controller = new AbortController();
    const promise = uploadImageWithProgress(
      new File(["data"], "abort.jpg", { type: "image/jpeg" }),
      { signal: controller.signal }
    );

    controller.abort();

    await expect(promise).rejects.toThrowError(/abort/i);
  });

  it("maps 413 to size error", async () => {
    const promise = uploadImageWithProgress(
      new File(["data"], "too-big.jpg", { type: "image/jpeg" })
    );

    const req = MockXHR.requests[0];
    req.status = 413;
    req.response = "too large";
    req.triggerLoad();

    await expect(promise).rejects.toThrow(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
  });
});
