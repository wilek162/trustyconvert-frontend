import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import { apiClient } from "@/lib/api/client";

import { FileUpload } from "./FileUpload";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    startConversion: vi.fn(),
    getTaskStatus: vi.fn(),
    getSupportedFormats: vi.fn(),
  },
}));

// Mock react-dropzone
vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

describe("FileUpload", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock supported formats
    (apiClient.getSupportedFormats as jest.Mock).mockResolvedValue([
      {
        id: "pdf",
        name: "PDF",
        inputFormats: ["application/pdf"],
        outputFormats: ["docx", "txt"],
        maxSize: 10485760, // 10MB
        features: ["text-extraction"],
      },
    ]);
  });

  it("renders the upload area", () => {
    render(<FileUpload />, { wrapper });
    expect(screen.getByText(/drag & drop your file here/i)).toBeInTheDocument();
  });

  it("shows file info after selection", async () => {
    render(<FileUpload />, { wrapper });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button");

    await userEvent.upload(input, file);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByText(/select format/i)).toBeInTheDocument();
  });

  it("starts conversion when clicking convert button", async () => {
    (apiClient.startConversion as jest.Mock).mockResolvedValue({
      task_id: "123",
      file_id: "456",
      status: "pending",
      progress: 0,
    });

    render(<FileUpload />, { wrapper });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button");

    await userEvent.upload(input, file);

    // Select format
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "docx");

    // Click convert button
    const convertButton = screen.getByText(/convert now/i);
    await userEvent.click(convertButton);

    expect(apiClient.startConversion).toHaveBeenCalledWith(file, "docx");
  });

  it("shows error message on conversion failure", async () => {
    (apiClient.startConversion as jest.Mock).mockRejectedValue(
      new Error("Conversion failed")
    );

    render(<FileUpload />, { wrapper });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button");

    await userEvent.upload(input, file);

    // Select format
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "docx");

    // Click convert button
    const convertButton = screen.getByText(/convert now/i);
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
    });
  });

  it("shows progress during conversion", async () => {
    (apiClient.startConversion as jest.Mock).mockResolvedValue({
      task_id: "123",
      file_id: "456",
      status: "processing",
      progress: 50,
    });

    (apiClient.getTaskStatus as jest.Mock).mockResolvedValue({
      task_id: "123",
      file_id: "456",
      status: "processing",
      progress: 50,
    });

    render(<FileUpload />, { wrapper });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button");

    await userEvent.upload(input, file);

    // Select format
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "docx");

    // Click convert button
    const convertButton = screen.getByText(/convert now/i);
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText(/converting/i)).toBeInTheDocument();
      expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });
  });

  it("shows download button on completion", async () => {
    (apiClient.startConversion as jest.Mock).mockResolvedValue({
      task_id: "123",
      file_id: "456",
      status: "completed",
      progress: 100,
      result_url: "https://example.com/result.docx",
    });

    render(<FileUpload />, { wrapper });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = screen.getByRole("button");

    await userEvent.upload(input, file);

    // Select format
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "docx");

    // Click convert button
    const convertButton = screen.getByText(/convert now/i);
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByText(/download converted file/i)).toBeInTheDocument();
    });
  });
});
