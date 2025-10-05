import React from "react";
import { render } from "@testing-library/react";
import ClientInteractiveLayer from "./index";

describe("ClientInteractiveLayer", () => {
  test("renders without crashing", () => {
    render(<ClientInteractiveLayer />);
  });
});
