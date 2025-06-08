import { atom } from "nanostores";

// CSRF token store
export const csrfToken = atom<string | null>(null);

// Task status type
export type TaskStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "completed"
  | "failed";

// Conversion state store
export interface ConversionState {
  taskId: string | null;
  status: TaskStatus;
  progress: number;
  error?: string;
  filename?: string;
  targetFormat?: string;
  resultUrl?: string;
}

// Initial conversion state
const initialConversionState: ConversionState = {
  taskId: null,
  status: "idle",
  progress: 0,
};

// Conversion state store
export const conversionState = atom<ConversionState>(initialConversionState);

// Action to update conversion status
export function updateConversionStatus(
  status: TaskStatus,
  data: Partial<ConversionState>
) {
  conversionState.set({
    ...conversionState.get(),
    status,
    ...data,
  });
}

// Action to update conversion progress
export function updateConversionProgress(progress: number) {
  conversionState.set({
    ...conversionState.get(),
    progress,
  });
}

// Action to reset conversion state
export function resetConversion() {
  conversionState.set(initialConversionState);
}

// Action to set CSRF token
export function setCsrfToken(token: string | null) {
  csrfToken.set(token);
}
