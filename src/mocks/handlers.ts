// src/mocks/handlers.ts
import { http, HttpResponse, type HttpHandler } from "msw";

import { mockResponses, mockFormats } from "./data";

export const handlers: HttpHandler[] = [
  // Get supported formats
  http.get("/api/supported-conversions", () => {
    return HttpResponse.json({ data: mockFormats });
  }),

  // Start conversion
  http.post("/api/convert", async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const targetFormat = formData.get("targetFormat") as string;

    // Simulate validation errors
    if (!file) {
      return new HttpResponse(
        JSON.stringify({
          error: "No file provided",
          code: "VALIDATION_ERROR",
        }),
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return new HttpResponse(
        JSON.stringify({
          error: "File too large",
          code: "FILE_TOO_LARGE",
          details: { maxSize: "50MB" },
        }),
        { status: 400 }
      );
    }

    // Simulate successful conversion start
    await new Promise((resolve) => setTimeout(resolve, 500));

    return HttpResponse.json({
      id: "conv_123",
      status: "processing",
      originalName: file.name,
      targetFormat,
    });
  }),

  // Check conversion status
  http.get("/api/status/:id", ({ params }) => {
    const { id } = params;
    const progress = Math.random();

    if (progress < 0.3) {
      return HttpResponse.json({
        ...mockResponses.progress,
        id,
      });
    }

    if (progress < 0.9) {
      return HttpResponse.json({
        ...mockResponses.success,
        id,
      });
    }

    return new HttpResponse(
      JSON.stringify({
        ...mockResponses.error,
        id,
      }),
      { status: 500 }
    );
  }),

  // Download converted file
  http.get("/api/download/:id", () => {
    return new HttpResponse("mock file content", {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="converted.pdf"',
      },
    });
  }),
];
