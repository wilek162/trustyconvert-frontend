import { ConversionFormat } from "@/lib/api/types";

// Mock file objects for testing
export const mockFiles = {
  smallPdf: new File([new ArrayBuffer(2 * 1024 * 1024)], "small.pdf", {
    type: "application/pdf",
  }),
  largeDoc: new File([new ArrayBuffer(15 * 1024 * 1024)], "large.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }),
  image: new File([new ArrayBuffer(1024 * 1024)], "photo.jpg", {
    type: "image/jpeg",
  }),
  invalid: new File([new ArrayBuffer(1024)], "invalid.xyz", {
    type: "application/octet-stream",
  }),
};

// Mock API responses
export const mockResponses = {
  success: {
    id: "conv_123",
    status: "completed",
    downloadUrl: "https://example.com/download/123",
    format: "pdf",
    originalName: "document.docx",
    size: 1024 * 1024,
    createdAt: new Date().toISOString(),
  },
  error: {
    status: "error",
    message: "Conversion failed: File format not supported",
    code: "CONV_ERR_001",
    details: {
      maxSize: "50MB",
      supportedFormats: ["pdf", "docx", "xlsx"],
    },
  },
  progress: {
    status: "processing",
    progress: 45,
    eta: "30 seconds",
    stage: "converting",
    startedAt: new Date().toISOString(),
  },
};

// Mock supported formats
export const mockFormats: ConversionFormat[] = [
  {
    id: "pdf",
    name: "PDF Document",
    mimeType: "application/pdf",
    maxSize: 50 * 1024 * 1024,
    outputFormats: ["docx", "txt", "jpg"],
    description: "Convert PDF files to other formats",
  },
  {
    id: "docx",
    name: "Word Document",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxSize: 25 * 1024 * 1024,
    outputFormats: ["pdf", "txt"],
    description: "Convert Word documents to other formats",
  },
  {
    id: "jpg",
    name: "JPEG Image",
    mimeType: "image/jpeg",
    maxSize: 10 * 1024 * 1024,
    outputFormats: ["png", "pdf", "webp"],
    description: "Convert JPEG images to other formats",
  },
];
