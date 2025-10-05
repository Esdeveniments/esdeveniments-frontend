import React from "react";
import { render } from "@testing-library/react";
import AddToCalendar from "./index";

describe("AddToCalendar", () => {
  test("renders without crashing", () => {
    render(<AddToCalendar />);
  });
});
