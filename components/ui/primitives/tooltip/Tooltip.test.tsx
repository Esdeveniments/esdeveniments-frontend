import React from "react";
import { render } from "@testing-library/react";
import Tooltip from "./index";

describe("Tooltip", () => {
  test("renders without crashing", () => {
    render(<Tooltip />);
  });
});
