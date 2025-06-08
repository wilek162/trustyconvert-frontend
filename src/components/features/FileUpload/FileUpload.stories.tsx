import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { rest } from "msw";

import { FileUpload } from "./FileUpload";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta = {
  title: "Features/FileUpload",
  component: FileUpload,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-[600px]">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMockedData: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get("/api/supported-conversions", (req, res, ctx) => {
          return res(
            ctx.json([
              {
                id: "pdf",
                name: "PDF",
                inputFormats: ["application/pdf"],
                outputFormats: ["docx", "txt"],
                maxSize: 10485760, // 10MB
                features: ["text-extraction"],
              },
              {
                id: "docx",
                name: "Word Document",
                inputFormats: [
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                outputFormats: ["pdf", "txt"],
                maxSize: 10485760, // 10MB
                features: ["text-extraction"],
              },
            ])
          );
        }),
        rest.post("/api/convert", (req, res, ctx) => {
          return res(
            ctx.json({
              task_id: "123",
              file_id: "456",
              status: "pending",
              progress: 0,
            })
          );
        }),
        rest.get("/api/convert/:taskId/status", (req, res, ctx) => {
          const { taskId } = req.params;
          return res(
            ctx.json({
              task_id: taskId,
              file_id: "456",
              status: "processing",
              progress: 50,
            })
          );
        }),
      ],
    },
  },
};

export const WithError: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get("/api/supported-conversions", (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              code: "SERVER_ERROR",
              message: "Internal server error",
            })
          );
        }),
      ],
    },
  },
};

export const WithCompletedConversion: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get("/api/supported-conversions", (req, res, ctx) => {
          return res(
            ctx.json([
              {
                id: "pdf",
                name: "PDF",
                inputFormats: ["application/pdf"],
                outputFormats: ["docx", "txt"],
                maxSize: 10485760, // 10MB
                features: ["text-extraction"],
              },
            ])
          );
        }),
        rest.post("/api/convert", (req, res, ctx) => {
          return res(
            ctx.json({
              task_id: "123",
              file_id: "456",
              status: "completed",
              progress: 100,
              result_url: "https://example.com/result.docx",
            })
          );
        }),
      ],
    },
  },
};
