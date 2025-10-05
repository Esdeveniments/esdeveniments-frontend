import React from "react";
import { render } from "@testing-library/react";
import Notification from "./index";

describe("Notification", () => {
  test("renders without crashing", () => {
    render(<Notification />);
  });
});
