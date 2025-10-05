import React from "react";
import { render } from "@testing-library/react";
import Base from "./index";

describe("Base", () => {
  test("renders without crashing", () => {
    render(<Base />);
  });
});
