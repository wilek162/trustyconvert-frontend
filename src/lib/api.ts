export async function convertFile(
  file: File,
  targetFormat: string,
  onProgress?: (percent: number) => void
): Promise<{ filename: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true; // Send cookies (session) with request
    const formData = new FormData();
    formData.append("file", file);

    // Use relative URL for Vite proxy
    const url = `/api/convert?target_format=${encodeURIComponent(
      targetFormat
    )}`;
    console.log("Sending file to:", url);

    xhr.open("POST", url, true);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const disposition = xhr.getResponseHeader("Content-Disposition");
        let filename = "converted_file";
        if (disposition) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match) {
            filename = match[1];
          }
        }
        resolve({ filename, blob: xhr.response });
      } else {
        // Try to parse error message from JSON
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            reject(new Error(json.detail || "Conversion failed"));
          } catch {
            reject(new Error("Conversion failed"));
          }
        };
        reader.readAsText(xhr.response);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.send(formData);
  });
}

// Download file with credentials and error handling
export async function downloadFile(filename: string): Promise<Blob> {
  // Use relative URL for Vite proxy
  const url = `/api/download/${encodeURIComponent(filename)}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    throw new Error(message);
  }
  return await response.blob();
}
