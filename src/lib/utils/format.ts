/**
 * Formats a file size in bytes to a human readable string
 * @param bytes The size in bytes
 * @returns A formatted string (e.g., "1.5 MB", "800 KB", etc.)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
