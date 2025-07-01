import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes correctly", () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("applies size classes correctly", () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.firstChild).toHaveClass("h-10");
  });

  it("shows loading state correctly", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("text-transparent");
  });

  it("renders start and end icons", () => {
    const StartIcon = () => <span data-testid="start-icon">Start</span>;
    const EndIcon = () => <span data-testid="end-icon">End</span>;

    render(
      <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
        With Icons
      </Button>
    );

    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
  });

  it("supports asChild prop", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveClass("bg-primary"); // Should inherit button styles
  });

  it("is disabled when loading or disabled prop is true", () => {
    const { rerender } = render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("maintains accessibility attributes", () => {
    render(
      <Button aria-label="Accessible Button" aria-describedby="description">
        Accessible
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Accessible Button");
    expect(button).toHaveAttribute("aria-describedby", "description");
  });
});
