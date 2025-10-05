import React from "react";
import { render } from "@testing-library/react";
import AdBoard from "./index";

describe("AdBoard", () => {
  test("renders without crashing", () => {
    render(<AdBoard />);
  });
});
