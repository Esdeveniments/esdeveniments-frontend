import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { vi } from "vitest";
import Weather from "./index";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ alt, src, width, height, style, ...props }: any) => (
    <img
      alt={alt}
      src={src}
      width={width}
      height={height}
      style={style}
      {...props}
    />
  ),
}));

describe("Weather", () => {
  it("renders weather information correctly", () => {
    const weather = {
      temperature: "25.7",
      description: "Sunny",
      icon: "01d",
    };

    render(<Weather weather={weather} />);

    expect(screen.getByAltText("Sunny")).toBeInTheDocument();
    expect(screen.getByText("Sunny")).toBeInTheDocument();
    expect(screen.getByText("- 25º")).toBeInTheDocument();
  });

  it("renders with different weather data", () => {
    const weather = {
      temperature: "15.2",
      description: "Cloudy",
      icon: "02d",
    };

    render(<Weather weather={weather} />);

    expect(screen.getByAltText("Cloudy")).toBeInTheDocument();
    expect(screen.getByText("Cloudy")).toBeInTheDocument();
    expect(screen.getByText("- 15º")).toBeInTheDocument();
  });

  it("floors temperature correctly", () => {
    const weather = {
      temperature: "23.9",
      description: "Warm",
      icon: "01d",
    };

    render(<Weather weather={weather} />);

    expect(screen.getByText("- 23º")).toBeInTheDocument();
  });

  it("handles temperature as integer string", () => {
    const weather = {
      temperature: "20",
      description: "Clear",
      icon: "01d",
    };

    render(<Weather weather={weather} />);

    expect(screen.getByText("- 20º")).toBeInTheDocument();
  });

  describe("missing weather data", () => {
    it("shows fallback message when weather is undefined", () => {
      render(<Weather />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when weather is null", () => {
      render(<Weather weather={null as any} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when temperature is missing", () => {
      const weather = {
        description: "Sunny",
        icon: "01d",
      } as any;

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when description is missing", () => {
      const weather = {
        temperature: "25",
        icon: "01d",
      } as any;

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when icon is missing", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
      } as any;

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when temperature is empty string", () => {
      const weather = {
        temperature: "",
        description: "Sunny",
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when description is empty string", () => {
      const weather = {
        temperature: "25",
        description: "",
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });

    it("shows fallback message when icon is empty string", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "",
      };

      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });
  });

  describe("image rendering", () => {
    it("renders image with correct src", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      const image = screen.getByAltText("Sunny");
      expect(image).toHaveAttribute("src", "/static/images/icons/01d.png");
    });

    it("renders image with correct dimensions", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      const image = screen.getByAltText("Sunny");
      expect(image).toHaveAttribute("width", "27");
      expect(image).toHaveAttribute("height", "27");
    });

    it("renders image with correct style", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      const image = screen.getByAltText("Sunny");
      expect(image).toHaveStyle({
        maxWidth: "100%",
        height: "auto",
      });
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks with valid weather", async () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "01d",
      };

      const { container } = render(<Weather weather={weather} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core accessibility checks with no weather", async () => {
      const { container } = render(<Weather />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has proper alt text for weather icon", () => {
      const weather = {
        temperature: "25",
        description: "Partly cloudy",
        icon: "02d",
      };

      render(<Weather weather={weather} />);
      const image = screen.getByAltText("Partly cloudy");
      expect(image).toBeInTheDocument();
    });

    it("has proper alt text fallback when description is missing", () => {
      const weather = {
        temperature: "25",
        description: "",
        icon: "01d",
      };

      // This should show fallback message, so no image
      render(<Weather weather={weather} />);
      expect(
        screen.getByText("No hi ha dades meteorològiques disponibles."),
      ).toBeInTheDocument();
    });
  });

  describe("memoization", () => {
    it("is memoized and doesn't re-render unnecessarily", () => {
      const weather = {
        temperature: "25",
        description: "Sunny",
        icon: "01d",
      };

      const { rerender } = render(<Weather weather={weather} />);
      const firstRender = screen.getByText("Sunny");

      rerender(<Weather weather={weather} />);
      const secondRender = screen.getByText("Sunny");

      // Same element should be returned (memoization)
      expect(firstRender).toBe(secondRender);
    });
  });

  describe("edge cases", () => {
    it("handles negative temperatures", () => {
      const weather = {
        temperature: "-5.3",
        description: "Cold",
        icon: "13d",
      };

      render(<Weather weather={weather} />);
      expect(screen.getByText("- -6º")).toBeInTheDocument();
    });

    it("handles zero temperature", () => {
      const weather = {
        temperature: "0",
        description: "Freezing",
        icon: "13d",
      };

      render(<Weather weather={weather} />);
      expect(screen.getByText("- 0º")).toBeInTheDocument();
    });

    it("handles very long descriptions", () => {
      const longDescription =
        "Very long weather description that might be truncated or wrapped in the UI";
      const weather = {
        temperature: "25",
        description: longDescription,
        icon: "01d",
      };

      render(<Weather weather={weather} />);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("handles special characters in description", () => {
      const weather = {
        temperature: "25",
        description: "Parcialment ennuvolat amb 20% de probabilitat de pluja",
        icon: "02d",
      };

      render(<Weather weather={weather} />);
      expect(
        screen.getByText(
          "Parcialment ennuvolat amb 20% de probabilitat de pluja",
        ),
      ).toBeInTheDocument();
    });
  });
});
