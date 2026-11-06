import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { REVEAL_THROTTLE_OFF_SCRIPT } from "@utils/constants";

// REVEAL_THROTTLE_OFF_SCRIPT relies on how React's streaming runtime ($RC)
// reads $RT. If a React upgrade changes that, the script silently stops
// working (listings and the event page lose 170-250 ms of LCP), so run the
// real runtime from both server builds and check which path it takes.
const require = createRequire(import.meta.url);
const runtimes = [
  "next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js",
  "next/dist/compiled/react-dom-experimental/cjs/react-dom-server.node.production.js",
];

function loadRuntime(file: string): string {
  const source = readFileSync(require.resolve(file), "utf8");
  const literal = source.match(/'\$RB=\[\];\$RV=function(?:[^'\\]|\\.)*'/)?.[0];
  if (!literal) throw new Error(`$RC runtime not found in ${file}`);
  return new Function(`return ${literal}`)() as string;
}

function revealBoundary(runtime: string, hidden: boolean) {
  vi.spyOn(document, "hidden", "get").mockReturnValue(hidden);
  document.body.innerHTML =
    '<!--$?--><template id="B:0"></template><p>skeleton</p><!--/$-->' +
    '<div hidden id="S:0"><p>content</p></div>';
  const raf = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation(() => 0);
  const timeout = vi
    .spyOn(globalThis, "setTimeout")
    .mockImplementation((() => 0) as unknown as typeof setTimeout);
  new Function(runtime)();
  // React's shell script: requestAnimationFrame(() => $RT = performance.now())
  new Function("$RT=performance.now()")();
  new Function('$RC("B:0","S:0")')();
  const calls = { raf: raf.mock.calls.length, timeout: timeout.mock.calls.length };
  vi.restoreAllMocks();
  return calls;
}

describe("React SSR reveal throttle", () => {
  beforeAll(() => {
    new Function(REVEAL_THROTTLE_OFF_SCRIPT)();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test.each(runtimes)(
    "%s reveals on the next frame in a visible tab",
    (file) => {
      expect(revealBoundary(loadRuntime(file), false)).toEqual({
        raf: 1,
        timeout: 0,
      });
    },
  );

  test.each(runtimes)(
    "%s keeps React's timeout in a hidden tab, where frames don't run",
    (file) => {
      expect(revealBoundary(loadRuntime(file), true)).toEqual({
        raf: 0,
        timeout: 1,
      });
    },
  );
});
