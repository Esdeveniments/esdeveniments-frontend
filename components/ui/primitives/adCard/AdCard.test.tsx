import React from "react";
import { render } from "@testing-library/react";
import AdCard from "./index";

describe("AdCard", () => {
  test("renders without crashing", () => {
    render(<AdCard />);
  });
});
