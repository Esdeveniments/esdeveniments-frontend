import React from "react";
import { render } from "@testing-library/react";
import Social from "./index";

describe("Social", () => {
  test("renders without crashing", () => {
    render(<Social />);
  });
});
