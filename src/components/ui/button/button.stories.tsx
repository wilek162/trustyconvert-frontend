import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Loader2 } from "lucide-react";

import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    loading: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    asChild: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Base button story
export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
};

// Variants
export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive Button",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline Button",
    variant: "outline",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link Button",
    variant: "link",
  },
};

// Sizes
export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
  },
};

// States
export const Loading: Story = {
  args: {
    children: "Loading",
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

// With Icons
export const WithStartIcon: Story = {
  args: {
    children: "Email",
    startIcon: <Mail className="h-4 w-4" />,
  },
};

export const WithEndIcon: Story = {
  args: {
    children: "Send",
    endIcon: <Mail className="h-4 w-4" />,
  },
};

export const IconButton: Story = {
  args: {
    size: "icon",
    "aria-label": "Send email",
    children: <Mail className="h-4 w-4" />,
  },
};

// As Child
export const AsLink: Story = {
  args: {
    asChild: true,
    children: <a href="#">Link as Button</a>,
  },
};
