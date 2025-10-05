import React from "react";
import { render } from "@testing-library/react";
import LoadMoreButton from "./index";

describe("LoadMoreButton", () => {
  test("renders without crashing", () => {
    render(<LoadMoreButton />);
  });
});
