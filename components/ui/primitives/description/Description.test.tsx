import React from "react";
import { render } from "@testing-library/react";
import Description from "./index";

describe("Description", () => {
  test("renders without crashing", () => {
    render(<Description />);
  });
});
