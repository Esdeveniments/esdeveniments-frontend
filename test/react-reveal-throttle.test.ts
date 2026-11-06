import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import { REVEAL_THROTTLE_OFF_SCRIPT } from "@utils/constants";

// REVEAL_THROTTLE_OFF_SCRIPT relies on how React's streaming runtime ($RC)
// reads $RT. If a React upgrade changes that, the script silently stops
// working (listings and the event page lose 170-250 ms of LCP), so check it.
const require = createRequire(import.meta.url);
const runtimes = [
  "next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js",
  "next/dist/compiled/react-dom-experimental/cjs/react-dom-server.node.production.js",
];

describe("React SSR reveal throttle", () => {
  test.each(runtimes)("%s still throttles on a numeric $RT", (file) => {
    const source = readFileSync(require.resolve(file), "utf8");
    expect(source).toContain(
      '"number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB))',
    );
    expect(source).toContain("$RT+300-a");
  });

  test("the head script keeps $RT from ever being a number", () => {
    new Function(REVEAL_THROTTLE_OFF_SCRIPT)();
    const win = window as unknown as { $RT: unknown };
    win.$RT = performance.now();
    expect(typeof win.$RT).not.toBe("number");
  });
});
