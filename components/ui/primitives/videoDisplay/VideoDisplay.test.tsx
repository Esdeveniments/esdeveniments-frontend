import React from "react";
import { render } from "@testing-library/react";
import VideoDisplay from "./index";

describe("VideoDisplay", () => {
  test("renders without crashing", () => {
    render(<VideoDisplay />);
  });
});
