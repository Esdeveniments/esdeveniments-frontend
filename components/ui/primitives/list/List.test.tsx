import React from "react";
import { render } from "@testing-library/react";
import List from "./index";

describe("List", () => {
  test("renders without crashing", () => {
    render(<List />);
  });
});
