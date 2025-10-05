import React from "react";
import { render } from "@testing-library/react";
import Loading from "./index";

describe("Loading", () => {
  test("renders without crashing", () => {
    render(<Loading />);
  });
});
