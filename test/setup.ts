import "@testing-library/jest-dom";
import "jest-axe/extend-expect";
import { configure } from "@testing-library/react";

configure({
  testIdAttribute: "data-testid",
});
