# Securing file access for active sessions
_Exported on 6/2/2025 at 12:10:04 GMT+2 from Cursor (0.50.5)_

---

**User**

 Everything almost works now but the files are still not secured for each session. Right now everyone can get all the active sessions uploads and converted files. Why does that happen? How can we fix that? 

---

**Cursor**



Based on the code and the documentation provided, the issue is likely rooted in how the backend API handles file access. While the frontend sends session cookies with requests (using `xhr.withCredentials = true` and `credentials: "include"`), the backend is likely not using these session identifiers to restrict access to specific files.

Currently, when a file is converted, the frontend is redirected to a `/download` page with the filename as a query parameter (`/download?filename=...`). This means anyone who knows or can guess the filename can potentially access the converted file by navigating to this URL, regardless of their session.

**Why this happens:**

1.  **Filename in URL:** The converted filename is exposed directly in the URL.
2.  **Backend Access Control (likely missing):** The backend API serving `/api/download/{filename}` probably retrieves and serves the file based solely on the filename, without checking if the request originates from the same session that initiated the conversion.

**How to fix this:**

The solution requires changes primarily on the backend, but the frontend needs to be updated to use a more secure identifier.

1.  **Backend Modification:**
    *   When a file is uploaded and converted, the backend should generate a unique, session-specific identifier for the converted file. This identifier should not be easily guessable and should be tied to the user's current session ID on the server.
    *   The backend should store this identifier along with the file information (like the actual file path on the server) and the associated session ID.
    *   Instead of returning the original filename to the frontend, the backend should return this secure, session-specific identifier upon successful conversion.
    *   The `/api/download` endpoint should be modified to accept this secure identifier. When a download request comes in, the backend must verify that the provided identifier is valid *and* that it is associated with the requesting user's current session ID. Only if both checks pass should the file be served.

2.  **Frontend Modification:**
    *   Update the `convertFile` function in `src/lib/api.ts` to expect the secure identifier from the backend response instead of just the filename.
    *   Modify the redirect in the `handleSubmit` function in `src/components/FileUpload.tsx` to use this secure identifier in the query parameter (e.g., `/download?id=...`) instead of the raw filename.
    *   Update the client-side script in `src/pages/download.astro` to read the secure identifier from the URL (e.g., `id`) and pass it to the `downloadFile` function in `src/lib/api.ts`.
    *   Update the `downloadFile` function in `src/lib/api.ts` to use this identifier in the fetch request URL (e.g., `/api/download/${id}`).

Since the backend code is not provided in the attached files, I cannot make the necessary backend modifications. However, I can show you the changes required on the frontend to use a secure identifier once the backend is updated.

Here are the changes needed in `src/components/FileUpload.tsx` and `src/pages/download.astro` assuming the backend will now return a `fileId` upon successful conversion.

**`src/components/FileUpload.tsx`:**

Modify the `handleSubmit` function to expect and use `fileId` from the `convertFile` response.

```language:src/components/FileUpload.tsx
// ... existing code ...

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // Assume backend now returns a fileId instead of filename
      const { fileId } = await convertFile(
        file,
        targetFormat,
        setProgress
      );
      // Redirect to download page with secure fileId as query param
      window.location.href = `/download?id=${encodeURIComponent(
        fileId
      )}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

// ... existing code ...
```

**`src/pages/download.astro`:**

Modify the Astro page and the client-side script to use the `id` query parameter instead of `filename`.

```language:src/pages/download.astro
---
import MainLayout from "@/layouts/mainLayout.astro";
// No longer need downloadFile import here as it's used client-side
// import { downloadFile } from "@/lib/api";

const { searchParams } = new URL(Astro.request.url);
// Read the secure file ID from the query parameter
const fileId = searchParams.get("id");

// Fix: Astro injects variables as strings, so check for null/empty
const hasFileId = fileId && fileId !== "null" && fileId !== "undefined";

console.log("Download page accessed");
console.log("Request URL:", Astro.request.url);
// Log the parsed file ID
console.log("Parsed file ID from query param:", fileId);

const title = "Download your converted file - TrustyConvert";
const description = "Your file is ready to download!";
const canonical = "https://trustyconvert.com/download";
const ogImage = "https://trustyconvert.com/og-image.png";
---

<MainLayout
  title={title}
  description={description}
  canonical={canonical}
  ogImage={ogImage}
>
  <section class="max-w-xl mx-auto py-24 px-4 text-center">
    <h1 class="text-3xl font-bold mb-4">Your file is ready!</h1>
    <div id="download-area">
      <button
        id="download-btn"
        class="inline-block px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition hidden"
      >
        Download
      </button>
      <p id="no-file-msg">No file found or session expired. Please try converting again.</p>
    </div>
    <p class="mt-4 text-muted-foreground">Thank you for using TrustyConvert!</p>
    <script type="module" is:inline>
      const btn = document.getElementById("download-btn");
      const msg = document.getElementById("no-file-msg");
      // Read the secure file ID from the URL
      const fileId = new URL(window.location.href).searchParams.get(
        "id"
      );
      if (btn && msg) {
        if (fileId) {
          btn.classList.remove("hidden");
          // Display a generic name or fetch filename using the ID if needed
          btn.textContent = `Download File`; // Or a placeholder name
          msg.style.display = "none";
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Downloading...";
            try {
              const mod = await import("/src/lib/api.ts");
              // Pass the secure fileId to downloadFile
              const blob = await mod.downloadFile(fileId);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              // You might want the backend to return the original filename along with the blob
              // For now, a generic name or the fileId can be used if filename isn't available
              a.download = fileId + "_converted"; // Placeholder download name
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              btn.textContent = `Download again`;
              btn.disabled = false;
            } catch (err) {
              btn.textContent = "Download failed";
              btn.classList.add("bg-red-600");
              msg.style.display = "block";
              msg.textContent =
                "File not found or session expired. Please try converting again in the same browser tab/window.";
            }
          });
        } else {
          btn.classList.add("hidden");
          msg.style.display = "block";
        }
      }
    </script>
  </section>
</MainLayout>
```

**`src/lib/api.ts`:**

Update the `downloadFile` function to accept the `fileId` and use it in the request URL.

```language:src/lib/api.ts
// ... existing code ...

// Download file with credentials and error handling
export async function downloadFile(fileId: string): Promise<Blob> {
  // Use relative URL for Vite proxy and pass the secure fileId
  const url = `/api/download/${encodeURIComponent(fileId)}`;
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
    // Indicate a potential session issue in the error message
    throw new Error(message + ". This could be due to an expired session or invalid file ID.");
  }
  return await response.blob();
}

```

Remember, these frontend changes are dependent on the backend being updated to handle session-specific file identifiers and enforce session-based access control for downloads.

```plaintext
// ... existing code ...

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // Assume backend now returns a fileId instead of filename
      const { fileId } = await convertFile(
        file,
        targetFormat,
        setProgress
      );
      // Redirect to download page with secure fileId as query param
      window.location.href = `/download?id=${encodeURIComponent(
        fileId
      )}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

// ... existing code ...
```

```plaintext
---
import MainLayout from "@/layouts/mainLayout.astro";
// No longer need downloadFile import here as it's used client-side
// import { downloadFile } from "@/lib/api";

const { searchParams } = new URL(Astro.request.url);
// Read the secure file ID from the query parameter
const fileId = searchParams.get("id");

// Fix: Astro injects variables as strings, so check for null/empty
const hasFileId = fileId && fileId !== "null" && fileId !== "undefined";

console.log("Download page accessed");
console.log("Request URL:", Astro.request.url);
// Log the parsed file ID
console.log("Parsed file ID from query param:", fileId);

const title = "Download your converted file - TrustyConvert";
const description = "Your file is ready to download!";
const canonical = "https://trustyconvert.com/download";
const ogImage = "https://trustyconvert.com/og-image.png";
---

<MainLayout
  title={title}
  description={description}
  canonical={canonical}
  ogImage={ogImage}
>
  <section class="max-w-xl mx-auto py-24 px-4 text-center">
    <h1 class="text-3xl font-bold mb-4">Your file is ready!</h1>
    <div id="download-area">
      <button
        id="download-btn"
        class="inline-block px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition hidden"
      >
        Download
      </button>
      <p id="no-file-msg">No file found or session expired. Please try converting again.</p>
    </div>
    <p class="mt-4 text-muted-foreground">Thank you for using TrustyConvert!</p>
    <script type="module" is:inline>
      const btn = document.getElementById("download-btn");
      const msg = document.getElementById("no-file-msg");
      // Read the secure file ID from the URL
      const fileId = new URL(window.location.href).searchParams.get(
        "id"
      );
      if (btn && msg) {
        if (fileId) {
          btn.classList.remove("hidden");
          // Display a generic name or fetch filename using the ID if needed
          btn.textContent = `Download File`; // Or a placeholder name
          msg.style.display = "none";
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Downloading...";
            try {
              const mod = await import("/src/lib/api.ts");
              // Pass the secure fileId to downloadFile
              const blob = await mod.downloadFile(fileId);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              // You might want the backend to return the original filename along with the blob
              // For now, a generic name or the fileId can be used if filename isn't available
              a.download = fileId + "_converted"; // Placeholder download name
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              btn.textContent = `Download again`;
              btn.disabled = false;
            } catch (err) {
              btn.textContent = "Download failed";
              btn.classList.add("bg-red-600");
              msg.style.display = "block";
              msg.textContent =
                "File not found or session expired. Please try converting again in the same browser tab/window.";
            }
          });
        } else {
          btn.classList.add("hidden");
          msg.style.display = "block";
        }
      }
    </script>
  </section>
</MainLayout>
```

```plaintext
// ... existing code ...

// Download file with credentials and error handling
export async function downloadFile(fileId: string): Promise<Blob> {
  // Use relative URL for Vite proxy and pass the secure fileId
  const url = `/api/download/${encodeURIComponent(fileId)}`;
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
    // Indicate a potential session issue in the error message
    throw new Error(message + ". This could be due to an expired session or invalid file ID.");
  }
  return await response.blob();
}

```

---

**User**

Ok take a look at it all again but here is the backend routes: from fastapi import APIRouter, UploadFile, File, Query, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from app.core.security import (
    get_session_id,
    get_session_dir,
    sanitize_filename,
    is_allowed_file,
    is_file_size_allowed,
)
from app.services.converter import convert_file
from app.core.paths import get_output_path
from app.services.storage import save_temp_file
from app.utils.background import touch_session
from app.utils.rate_limit import limiter
import logging
import aiofiles
import mimetypes
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter()

"""
API route definitions for TrustyConvert.

Endpoints:
- POST /convert: Uploads, validates, and converts a file to the requested format.
- GET /download/{filename}: Downloads a converted file for the current session.

Key Features:
- Validates file size, extension, and MIME type.
- Uses session-based directories for uploads and outputs.
- Updates .last_access file on each session access for cleanup.
- Logs all major actions and errors.
"""


@router.post("/convert")
# @limiter.limit("10/minute")
async def convert(
    request: Request, target_format: str = Query(...), file: UploadFile = File(...)
):
    session_id = get_session_id(request)
    session_dir = get_session_dir(session_id)
    touch_session(session_dir)
    logger.info(f"File upload: {file.filename} [session: {session_id}]")
    try:
        contents = await file.read()
        if not is_file_size_allowed(contents):
            raise HTTPException(status_code=413, detail="File too large")
        safe_filename = sanitize_filename(file.filename)
        if not is_allowed_file(safe_filename, file.content_type, contents):
            raise HTTPException(
                status_code=400,
                detail="File type not allowed or does not match content",
            )
        # Save file
        file_path = session_dir / safe_filename
        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(contents)
        # Conversion logic
        source_format = safe_filename.split(".")[-1].lower()
        output_path = await convert_file(
            file_path, source_format, target_format, session_id
        )
        logger.info(f"Conversion complete: {file.filename} -> {output_path}")
        response = FileResponse(output_path, filename=Path(output_path).name)
        response.set_cookie("session_id", session_id, httponly=True, samesite="lax")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"Conversion failed for {file.filename} [session: {session_id}]"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Conversion failed. Please try again later."},
        )


@router.get("/download/{filename}")
# @limiter.limit("30/minute")
async def download_file(filename: str, request: Request):
    session_id = get_session_id(request)
    output_dir = get_output_path(session_id)
    touch_session(output_dir)
    safe_filename = sanitize_filename(filename)
    file_path = output_dir / safe_filename
    logger.info(f"Download requested: {safe_filename} [session: {session_id}]")
    # 🚨 Validate path is within session output directory
    if not str(file_path).startswith(str(output_dir.resolve())):
        raise HTTPException(status_code=403, detail="Unauthorized access to file")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not file_path.exists():
        logger.warning(f"File not found for download: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    guessed_mime_type, _ = mimetypes.guess_type(str(file_path))
    if not guessed_mime_type:
        guessed_mime_type = "application/octet-stream"
    return FileResponse(
        file_path,
        media_type=guessed_mime_type,
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"},
    )


---

**Cursor**



Okay, thank you for providing the backend code. This clarifies how the file handling and session management are currently implemented.

Based on the FastAPI code you provided, the reason files are not strictly secured to a single session for download, despite using session directories, is related to how the download link is generated and handled:

1.  **The `/convert` endpoint:**
    *   It correctly uses `get_session_id` and saves/outputs files within a `session_dir`.
    *   The response is `FileResponse(output_path, filename=Path(output_path).name)`. This means the converted file *itself* is sent back as the response to the POST request to `/api/convert`.

2.  **The Frontend's `handleSubmit` in `FileUpload.tsx`:**
    *   After receiving the response from `convertFile` (which, as we now know from the backend, is the file data), the frontend *redirects* the user's browser to `/download?filename=${encodeURIComponent(filename)}`.
    *   This redirect discards the file data received in the `/convert` response and instead navigates the user to a new page with the filename in the URL.

3.  **The Frontend's `download.astro` page:**
    *   This page reads the `filename` from the URL query parameter.
    *   The client-side script on this page then calls the *separate* frontend `downloadFile` function (`/src/lib/api.ts`), passing it the filename from the URL.

4.  **The Frontend's `downloadFile` in `src/lib/api.ts`:**
    *   This function makes a *new* GET request to `/api/download/{filename}`.

5.  **The Backend's `/download/{filename}` endpoint:**
    *   This endpoint takes the filename from the URL.
    *   It gets the `session_id` from the cookies of the current download request.
    *   It constructs the expected path: `output_dir / safe_filename`.
    *   Crucially, it checks `if not str(file_path).startswith(str(output_dir.resolve())):` to prevent directory traversal (good!).
    *   However, it **does not verify that the file was created during the *current* session**. It only checks if a file with that `safe_filename` exists *within the requesting session's output directory*.

**Why this allows accessing other sessions' files:**

If a file named `report.pdf` is converted in session A, and a user in session B requests `/download?filename=report.pdf`, the backend will look for `report.pdf` inside *session B's* output directory. If session B's output directory happens to contain a file also named `report.pdf` (perhaps from a previous conversion in session B, or if cleanup isn't instantaneous), the backend will serve *that* file to session B. The filename itself is the weak point because it's reused across sessions.

While it's unlikely a user would guess a filename from another *active* session and have a file of the *exact same name* coincidentally in their own directory, relying solely on the filename from the URL combined with the session directory check is not a robust per-session file security model. The primary issue is the unnecessary round trip and reliance on the filename in the URL after the `/convert` endpoint already provided the file.

**How to fix this:**

The most straightforward and secure approach given your backend implementation is to handle the file download directly from the response of the `/api/convert` call on the frontend, eliminating the need for the separate `/download` page and endpoint for converted files. The `/download` endpoint could potentially be kept for other purposes, but it shouldn't be the target for newly converted files.

Here's how to modify the frontend:

**1. Modify `src/components/FileUpload.tsx`:**

Remove the redirect and handle the file download directly within the `handleSubmit` function after receiving the response from `convertFile`. The `convertFile` function should be updated to return the `Blob` and the filename as it currently receives the `FileResponse`.

```language:src/components/FileUpload.tsx
// ... existing imports and state ...

  // Update convertFile to return filename and blob based on the backend's FileResponse
  // (Assuming convertFile in src/lib/api.ts is updated to extract this)
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // convertFile now handles the XHR and returns the Blob and filename
      const { filename, blob } = await convertFile(
        file,
        targetFormat,
        setProgress
      );

      // Directly create a download link for the received blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Use the filename received from the backend
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Optional: Redirect to a success page or show a success message
      // window.location.href = `/success?filename=${encodeURIComponent(filename)}`; // Example success page
      console.log(`File "${filename}" downloaded successfully.`);


    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress bar after a delay
      // Optionally clear the selected file state
      // setFile(null);
      // if (fileInputRef.current) {
      //   fileInputRef.current.value = "";
      // }
    }
  }

  // ... rest of the component ...
```

**2. Modify `src/lib/api.ts`:**

Update the `convertFile` function to process the `FileResponse` received from the backend and return the filename and the blob. The `downloadFile` function and the `/download` endpoint in the backend would no longer be needed for the main conversion flow, so you could potentially remove them or keep them for other specific download scenarios.

```language:src/lib/api.ts
// ... existing imports ...

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
    xhr.responseType = "blob"; // Expecting a Blob response (the file)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      // Backend returns 200 for successful conversion and sends the file
      if (xhr.status === 200) {
        const disposition = xhr.getResponseHeader("Content-Disposition");
        let filename = file.name; // Default to original name
        if (disposition) {
          const match = disposition.match(/filename\*?=utf-8''([^;]+)/i); // Prefer RFC 6266 for UTF-8 filenames
           if (match && match[1]) {
            try {
              filename = decodeURIComponent(match[1]);
            } catch (e) {
               console.error("Failed to decode filename from Content-Disposition", e);
               // Fallback or use a generic name
               filename = "converted_file";
            }
          } else {
             const classicMatch = disposition.match(/filename="?([^";]+)"?/); // Fallback to classic if RFC 6266 not found
             if (classicMatch && classicMatch[1]) {
               filename = classicMatch[1].replace(/\\"/g, '"'); // Handle escaped quotes
             }
          }
        }
        // Resolve with the extracted filename and the blob response
        resolve({ filename, blob: xhr.response });
      } else {
        // Handle errors from the backend (e.g., 400, 413, 500)
        const reader = new FileReader();
        reader.onload = () => {
          try {
            // Attempt to parse JSON error message from backend
            const json = JSON.parse(reader.result as string);
            reject(new Error(json.detail || `Conversion failed with status ${xhr.status}`));
          } catch {
            // If JSON parsing fails, return a generic error
            reject(new Error(`Conversion failed with status ${xhr.status}. Could not parse error message.`));
          }
        };
        // Read the error response body as text
        reader.readAsText(xhr.response);
      }
    };

    xhr.onerror = () => {
      // Handle network errors
      reject(new Error("Network error during file conversion."));
    };

    xhr.send(formData);
  });
}

// The downloadFile function and the /download page/endpoint are no longer needed
// for the primary conversion -> download flow with this approach.
// You can remove or refactor them if they aren't used elsewhere.
/*
export async function downloadFile(filename: string): Promise<Blob> {
  // ... (keep or remove based on other uses)
}
*/
```

**3. Remove or Rework `src/pages/download.astro`:**

Since the file download is now handled directly after conversion, the `/download` page is no longer necessary for this purpose. You can delete `src/pages/download.astro` or repurpose it for a different flow if needed.

**Summary of Fix:**

By handling the file download directly from the `/api/convert` response on the frontend, you leverage the fact that the backend is already correctly processing the upload and generating the file within the *current* session's context. There is no longer a need to pass a potentially ambiguous filename via a URL parameter to a separate endpoint, which significantly enhances security by tying the file directly to the request that generated it.

```plaintext
// ... existing imports and state ...

  // Update convertFile to return filename and blob based on the backend's FileResponse
  // (Assuming convertFile in src/lib/api.ts is updated to extract this)
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // convertFile now handles the XHR and returns the Blob and filename
      const { filename, blob } = await convertFile(
        file,
        targetFormat,
        setProgress
      );

      // Directly create a download link for the received blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Use the filename received from the backend
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Optional: Redirect to a success page or show a success message
      // window.location.href = `/success?filename=${encodeURIComponent(filename)}`; // Example success page
      console.log(`File "${filename}" downloaded successfully.`);


    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress bar after a delay
      // Optionally clear the selected file state
      // setFile(null);
      // if (fileInputRef.current) {
      //   fileInputRef.current.value = "";
      // }
    }
  }

  // ... rest of the component ...
```

```plaintext
// ... existing imports ...

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
    xhr.responseType = "blob"; // Expecting a Blob response (the file)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      // Backend returns 200 for successful conversion and sends the file
      if (xhr.status === 200) {
        const disposition = xhr.getResponseHeader("Content-Disposition");
        let filename = file.name; // Default to original name
        if (disposition) {
          const match = disposition.match(/filename\*?=utf-8''([^;]+)/i); // Prefer RFC 6266 for UTF-8 filenames
           if (match && match[1]) {
            try {
              filename = decodeURIComponent(match[1]);
            } catch (e) {
               console.error("Failed to decode filename from Content-Disposition", e);
               // Fallback or use a generic name
               filename = "converted_file";
            }
          } else {
             const classicMatch = disposition.match(/filename="?([^";]+)"?/); // Fallback to classic if RFC 6266 not found
             if (classicMatch && classicMatch[1]) {
               filename = classicMatch[1].replace(/\\"/g, '"'); // Handle escaped quotes
             }
          }
        }
        // Resolve with the extracted filename and the blob response
        resolve({ filename, blob: xhr.response });
      } else {
        // Handle errors from the backend (e.g., 400, 413, 500)
        const reader = new FileReader();
        reader.onload = () => {
          try {
            // Attempt to parse JSON error message from backend
            const json = JSON.parse(reader.result as string);
            reject(new Error(json.detail || `Conversion failed with status ${xhr.status}`));
          } catch {
            // If JSON parsing fails, return a generic error
            reject(new Error(`Conversion failed with status ${xhr.status}. Could not parse error message.`));
          }
        };
        // Read the error response body as text
        reader.readAsText(xhr.response);
      }
    };

    xhr.onerror = () => {
      // Handle network errors
      reject(new Error("Network error during file conversion."));
    };

    xhr.send(formData);
  });
}

// The downloadFile function and the /download page/endpoint are no longer needed
// for the primary conversion -> download flow with this approach.
// You can remove or refactor them if they aren't used elsewhere.
/*
export async function downloadFile(filename: string): Promise<Blob> {
  // ... (keep or remove based on other uses)
}
*/
```

---

**User**

Got it, however i still want a proper secure redirect to the download page when converted file is ready for download. How can we keep the redirct to download but rework the logic and workflow so it becomes secure?

---

**Cursor**



Okay, I understand you want to maintain the redirect to a separate download page but make the process secure. The key is to avoid using the easily guessable filename directly in the URL or as the primary identifier for retrieving the file.

Instead of relying on the filename + session directory check on the download request, we need a mechanism to securely link the conversion action in one request to the download action in a subsequent request, ensuring it's the *same session* downloading the *specific file* it just converted.

Here's a secure workflow and how to implement it with changes to both the frontend and backend:

**Secure Workflow:**

1.  **Conversion Request (`POST /api/convert`):**
    *   User uploads a file.
    *   Backend receives the file and the session ID (from cookie).
    *   Backend performs conversion and saves the output file in the session directory.
    *   **Instead of returning the file**, the backend generates a unique, single-use, time-limited token or identifier that is securely linked **internally on the backend** to the user's session ID and the path of the converted file.
    *   The backend returns a JSON response to the frontend containing this secure token/identifier and potentially the original filename (which is less sensitive now).

2.  **Frontend Redirect (`FileUpload.tsx`):**
    *   Frontend receives the secure token/identifier and filename from the `/api/convert` response.
    *   Frontend redirects the user's browser to the `/download` page, passing the secure token/identifier and filename as query parameters (e.g., `/download?token=...&filename=...`). The filename is included for display purposes, not for backend file retrieval.

3.  **Download Page Load (`download.astro`):**
    *   The browser navigates to the `/download` page, sending the session cookie.
    *   The client-side script on the `download.astro` page reads the secure token/identifier and filename from the URL.
    *   It displays the filename to the user and prepares for download.

4.  **Download Request (New Endpoint - e.g., `GET /api/download_secure?token=...`):**
    *   When the user clicks the download button on the `/download` page, the client-side script makes a *new* GET request to a dedicated secure download endpoint on the backend, passing the secure token/identifier as a query parameter. This request also sends the session cookie.

5.  **Backend Secure Download Endpoint (`GET /api/download_secure?token=...`):**
    *   Backend receives the request, including the secure token/identifier and the session ID (from cookie).
    *   Backend looks up the token/identifier in its temporary storage.
    *   It verifies that the token exists, is still valid (not expired or already used), **and is linked to the session ID from the current request's cookie**.
    *   If the verification passes, the backend retrieves the actual file path associated with the token, serves the file using `FileResponse`, and marks the token as used or deletes it.
    *   If the verification fails (token invalid, expired, used, or session mismatch), it returns a 403 Forbidden or 404 Not Found error.

This workflow ensures that only the session that initiated the conversion and received the valid token can download the specific file associated with that token.

Let's implement the necessary frontend changes and outline the required backend modifications.

**Frontend Changes:**

**1. `src/components/FileUpload.tsx`:**
Modify `handleSubmit` to expect a JSON response with `fileId` (the secure token) and `filename` from the `convertFile` call and redirect using the `fileId`.

```language:src/components/FileUpload.tsx
// ... existing imports and state ...

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // Assume backend now returns { fileId: string, filename: string }
      const { fileId, filename } = await convertFile(
        file,
        targetFormat,
        setProgress
      );
      // Redirect to download page with secure fileId and filename as query params
      // Filename is just for display on the download page
      window.location.href = `/download?id=${encodeURIComponent(fileId)}&filename=${encodeURIComponent(filename)}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

// ... rest of the component ...
```

**2. `src/lib/api.ts`:**
Modify `convertFile` to expect and handle a JSON response containing `fileId` and `filename`. Introduce a new `downloadConvertedFile` function that takes the `fileId` and makes a request to a new backend endpoint (e.g., `/api/download_secure`).

```language:src/lib/api.ts
// ... existing imports ...

// Modify convertFile to expect JSON response with fileId and filename
export async function convertFile(
  file: File,
  targetFormat: string,
  onProgress?: (percent: number) => void
): Promise<{ fileId: string; filename: string }> { // Expecting JSON response
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true; // Send cookies (session) with request
    const formData = new FormData();
    formData.append("file", file);

    const url = `/api/convert?target_format=${encodeURIComponent(targetFormat)}`;
    console.log("Sending file to:", url);

    xhr.open("POST", url, true);
    // Do not set responseType to 'blob' here, expect JSON first
    // xhr.responseType = 'json'; // Modern browsers support this

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
            // Assume backend returns JSON: { fileId: "...", filename: "..." }
            // If responseType is not 'json', need to parse manually
            const jsonResponse = JSON.parse(xhr.responseText);
            if (jsonResponse.fileId && jsonResponse.filename) {
                 resolve({ fileId: jsonResponse.fileId, filename: jsonResponse.filename });
            } else {
                 reject(new Error("Invalid response from server after conversion."));
            }
        } catch (e) {
            reject(new Error("Failed to parse server response after conversion."));
        }
      } else {
        // Handle errors (backend should return JSON errors)
        const reader = new FileReader();
        reader.onloadend = () => { // Use onloadend for both success and failure of readAsText
          try {
            const json = JSON.parse(reader.result as string);
            reject(new Error(json.detail || `Conversion failed with status ${xhr.status}`));
          } catch {
            // Fallback if response is not JSON
            reject(new Error(`Conversion failed with status ${xhr.status}. Server responded with: ${xhr.responseText.substring(0, 100)}...`));
          }
        };
         // Read the error response body as text if status is not 2xx
        if (xhr.response instanceof Blob) { // Check if response is a blob (e.g., default error page)
             reader.readAsText(xhr.response);
        } else { // Likely text response
             reject(new Error(`Conversion failed with status ${xhr.status}. Server responded with: ${xhr.responseText.substring(0, 100)}...`));
        }

      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file conversion."));
    };

    xhr.send(formData);
  });
}


// New function to download the converted file using the secure ID/token
export async function downloadConvertedFile(fileId: string): Promise<Blob> {
  // Use relative URL for Vite proxy and pass the secure fileId to the new endpoint
  const url = `/api/download_secure?id=${encodeURIComponent(fileId)}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include", // Send session cookie
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    // Indicate a potential session issue in the error message
    throw new Error(message + ". This could be due to an expired session or invalid link.");
  }

  // Get the filename from the Content-Disposition header if available
   let filename = "download"; // Default name
   const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=utf-8''([^;]+)/i); // Prefer RFC 6266
       if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch (e) {
           console.error("Failed to decode filename from Content-Disposition", e);
        }
      } else {
         const classicMatch = disposition.match(/filename="?([^";]+)"?/); // Fallback
         if (classicMatch && classicMatch[1]) {
           filename = classicMatch[1].replace(/\\"/g, '"');
         }
      }
    }


  // Return the blob and the filename
  return response.blob().then(blob => {
    // Add filename to the blob object or return as an object { blob, filename }
    // Returning an object is cleaner
    return Object.assign(blob, { filename: filename }); // Or return { blob, filename }
  });

}

// The original downloadFile function would be removed or unused for this flow
/*
export async function downloadFile(filename: string): Promise<Blob> {
  // ... (remove or keep if used elsewhere)
}
*/

```
*(Note: The `downloadConvertedFile` function now attempts to extract the filename from the `Content-Disposition` header, which the backend should set.)*

**3. `src/pages/download.astro`:**
Modify the page to read the `id` (secure token) and `filename` from the URL and use `downloadConvertedFile` in the client-side script.

```language:src/pages/download.astro
---
import MainLayout from "@/layouts/mainLayout.astro";
// downloadFile import is removed as it's handled client-side in the script
// import { downloadFile } from "@/lib/api";

const { searchParams } = new URL(Astro.request.url);
// Read the secure file ID (token) and filename from query params
const fileId = searchParams.get("id");
const displayFilename = searchParams.get("filename"); // Filename for display

// Check if we have both the file ID and a filename to display
const isValidDownloadLink = fileId && fileId !== "null" && fileId !== "undefined" && displayFilename && displayFilename !== "null" && displayFilename !== "undefined";


console.log("Download page accessed");
console.log("Request URL:", Astro.request.url);
// Log the parsed file ID and display filename
console.log("Parsed file ID:", fileId);
console.log("Parsed display filename:", displayFilename);

const title = "Download your converted file - TrustyConvert";
const description = "Your file is ready to download!";
const canonical = "https://trustyconvert.com/download";
const ogImage = "https://trustyconvert.com/og-image.png";
---

<MainLayout
  title={title}
  description={description}
  canonical={canonical}
  ogImage={ogImage}
>
  <section class="max-w-xl mx-auto py-24 px-4 text-center">
    <h1 class="text-3xl font-bold mb-4">Your file is ready!</h1>
    <div id="download-area">
      <button
        id="download-btn"
        class="inline-block px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition hidden"
      >
        Download
      </button>
      {/* Use the displayFilename read from the URL */}
      <p id="file-name-display" class="font-medium mt-2"></p>
      <p id="no-file-msg" class="text-red-600 text-sm mt-2 hidden">Invalid download link or session expired. Please try converting again.</p>
    </div>
    <p class="mt-4 text-muted-foreground">Thank you for using TrustyConvert!</p>
    <script type="module" is:inline>
      const btn = document.getElementById("download-btn");
      const msg = document.getElementById("no-file-msg");
      const fileNameDisplay = document.getElementById("file-name-display");

      // Read the secure file ID (token) and display filename from the URL
      const urlParams = new URLSearchParams(window.location.search);
      const fileId = urlParams.get("id");
      const displayFilename = urlParams.get("filename");


      if (btn && msg && fileNameDisplay) {
        // Check if we have a fileId to attempt download
        if (fileId) {
          btn.classList.remove("hidden");
          // Display the filename from the URL parameter
          fileNameDisplay.textContent = displayFilename || "Converted File";
          msg.classList.add("hidden"); // Hide the error message initially

          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Downloading...";
            try {
              // Import the new download function
              const mod = await import("/src/lib/api.ts");
              // Call the new function with the secure fileId
              // The function now returns { blob, filename }
              const { blob, filename } = await mod.downloadConvertedFile(fileId);

              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              // Use the filename returned from the download function (from Content-Disposition header)
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              btn.textContent = `Download again`;
              btn.disabled = false;
              // Optionally, remove the downloaded file from the server via another API call after successful download
            } catch (err) {
              console.error("Download failed:", err);
              btn.textContent = "Download failed";
              btn.classList.add("bg-red-600");
              msg.classList.remove("hidden"); // Show error message
              msg.textContent =
                err.message || "File not found or session expired. Please try converting again.";
            }
          });
        } else {
          // If no fileId is present in the URL, show error message
          btn.classList.add("hidden");
          fileNameDisplay.textContent = ""; // Clear filename display
          msg.classList.remove("hidden");
        }
      }
    </script>
  </section>
</MainLayout>
```

**Backend Changes (Outline):**

You need to modify the backend endpoints and potentially add a simple temporary storage mechanism.

1.  **Modify `POST /api/convert`:**
    *   Keep the file handling and conversion logic.
    *   After successfully saving the `output_path`, generate a unique, random, unguessable string (the `fileId` or token).
    *   Store this `fileId` along with the `session_id` and the `output_path` in a temporary storage (e.g., a Python dictionary, a cache like Redis, or a small database table). Add a timestamp for expiry.
    *   Return a JSON response like `{"fileId": "generated_token", "filename": "converted_file_name.ext"}` instead of `FileResponse`.

2.  **Implement a New Endpoint (`GET /api/download_secure`):**
    *   This endpoint should accept a `fileId` (token) as a query parameter.
    *   Get the `session_id` from the request cookie.
    *   Look up the provided `fileId` in your temporary storage.
    *   **Crucially, verify:**
        *   Does the `fileId` exist?
        *   Is the `fileId` associated with the `session_id` from the current request?
        *   Has the `fileId` expired or already been used?
    *   If all checks pass:
        *   Retrieve the `output_path` stored with the `fileId`.
        *   Validate the `output_path` still exists and is within a legitimate output directory (like your current directory traversal check).
        *   Serve the file using `FileResponse(output_path, filename=Path(output_path).name)`. Make sure to set the `Content-Disposition` header with the correct `filename`.
        *   Remove the `fileId` from temporary storage so it cannot be used again.
    *   If any check fails, return `HTTPException` with a 403 or 404 status code and a relevant detail message (e.g., "Invalid or expired download link").

This revised workflow using a secure, session-bound token passed via the redirect URL (and then used for the actual file request) provides a much stronger guarantee that only the original user in their active session can download the converted file.

```plaintext
// ... existing imports and state ...

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to convert.");
      return;
    }
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      // Assume backend now returns { fileId: string, filename: string }
      const { fileId, filename } = await convertFile(
        file,
        targetFormat,
        setProgress
      );
      // Redirect to download page with secure fileId and filename as query params
      // Filename is just for display on the download page
      window.location.href = `/download?id=${encodeURIComponent(fileId)}&filename=${encodeURIComponent(filename)}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

// ... rest of the component ...
```

```plaintext
// ... existing imports ...

// Modify convertFile to expect JSON response with fileId and filename
export async function convertFile(
  file: File,
  targetFormat: string,
  onProgress?: (percent: number) => void
): Promise<{ fileId: string; filename: string }> { // Expecting JSON response
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true; // Send cookies (session) with request
    const formData = new FormData();
    formData.append("file", file);

    const url = `/api/convert?target_format=${encodeURIComponent(targetFormat)}`;
    console.log("Sending file to:", url);

    xhr.open("POST", url, true);
    // Do not set responseType to 'blob' here, expect JSON first
    // xhr.responseType = 'json'; // Modern browsers support this

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
            // Assume backend returns JSON: { fileId: "...", filename: "..." }
            // If responseType is not 'json', need to parse manually
            const jsonResponse = JSON.parse(xhr.responseText);
            if (jsonResponse.fileId && jsonResponse.filename) {
                 resolve({ fileId: jsonResponse.fileId, filename: jsonResponse.filename });
            } else {
                 reject(new Error("Invalid response from server after conversion."));
            }
        } catch (e) {
            reject(new Error("Failed to parse server response after conversion."));
        }
      } else {
        // Handle errors (backend should return JSON errors)
        const reader = new FileReader();
        reader.onloadend = () => { // Use onloadend for both success and failure of readAsText
          try {
            const json = JSON.parse(reader.result as string);
            reject(new Error(json.detail || `Conversion failed with status ${xhr.status}`));
          } catch {
            // Fallback if response is not JSON
            reject(new Error(`Conversion failed with status ${xhr.status}. Server responded with: ${xhr.responseText.substring(0, 100)}...`));
          }
        };
         // Read the error response body as text if status is not 2xx
        if (xhr.response instanceof Blob) { // Check if response is a blob (e.g., default error page)
             reader.readAsText(xhr.response);
        } else { // Likely text response
             reject(new Error(`Conversion failed with status ${xhr.status}. Server responded with: ${xhr.responseText.substring(0, 100)}...`));
        }

      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file conversion."));
    };

    xhr.send(formData);
  });
}


// New function to download the converted file using the secure ID/token
export async function downloadConvertedFile(fileId: string): Promise<Blob> {
  // Use relative URL for Vite proxy and pass the secure fileId to the new endpoint
  const url = `/api/download_secure?id=${encodeURIComponent(fileId)}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include", // Send session cookie
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    // Indicate a potential session issue in the error message
    throw new Error(message + ". This could be due to an expired session or invalid link.");
  }

  // Get the filename from the Content-Disposition header if available
   let filename = "download"; // Default name
   const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=utf-8''([^;]+)/i); // Prefer RFC 6266
       if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch (e) {
           console.error("Failed to decode filename from Content-Disposition", e);
        }
      } else {
         const classicMatch = disposition.match(/filename="?([^";]+)"?/); // Fallback
         if (classicMatch && classicMatch[1]) {
           filename = classicMatch[1].replace(/\\"/g, '"');
         }
      }
    }


  // Return the blob and the filename
  return response.blob().then(blob => {
    // Add filename to the blob object or return as an object { blob, filename }
    // Returning an object is cleaner
    return Object.assign(blob, { filename: filename }); // Or return { blob, filename }
  });

}

// The original downloadFile function would be removed or unused for this flow
/*
export async function downloadFile(filename: string): Promise<Blob> {
  // ... (remove or keep if used elsewhere)
}
*/

```

```plaintext
---
import MainLayout from "@/layouts/mainLayout.astro";
// downloadFile import is removed as it's handled client-side in the script
// import { downloadFile } from "@/lib/api";

const { searchParams } = new URL(Astro.request.url);
// Read the secure file ID (token) and filename from query params
const fileId = searchParams.get("id");
const displayFilename = searchParams.get("filename"); // Filename for display

// Check if we have both the file ID and a filename to display
const isValidDownloadLink = fileId && fileId !== "null" && fileId !== "undefined" && displayFilename && displayFilename !== "null" && displayFilename !== "undefined";


console.log("Download page accessed");
console.log("Request URL:", Astro.request.url);
// Log the parsed file ID and display filename
console.log("Parsed file ID:", fileId);
console.log("Parsed display filename:", displayFilename);

const title = "Download your converted file - TrustyConvert";
const description = "Your file is ready to download!";
const canonical = "https://trustyconvert.com/download";
const ogImage = "https://trustyconvert.com/og-image.png";
---

<MainLayout
  title={title}
  description={description}
  canonical={canonical}
  ogImage={ogImage}
>
  <section class="max-w-xl mx-auto py-24 px-4 text-center">
    <h1 class="text-3xl font-bold mb-4">Your file is ready!</h1>
    <div id="download-area">
      <button
        id="download-btn"
        class="inline-block px-6 py-3 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition hidden"
      >
        Download
      </button>
      {/* Use the displayFilename read from the URL */}
      <p id="file-name-display" class="font-medium mt-2"></p>
      <p id="no-file-msg" class="text-red-600 text-sm mt-2 hidden">Invalid download link or session expired. Please try converting again.</p>
    </div>
    <p class="mt-4 text-muted-foreground">Thank you for using TrustyConvert!</p>
    <script type="module" is:inline>
      const btn = document.getElementById("download-btn");
      const msg = document.getElementById("no-file-msg");
      const fileNameDisplay = document.getElementById("file-name-display");

      // Read the secure file ID (token) and display filename from the URL
      const urlParams = new URLSearchParams(window.location.search);
      const fileId = urlParams.get("id");
      const displayFilename = urlParams.get("filename");


      if (btn && msg && fileNameDisplay) {
        // Check if we have a fileId to attempt download
        if (fileId) {
          btn.classList.remove("hidden");
          // Display the filename from the URL parameter
          fileNameDisplay.textContent = displayFilename || "Converted File";
          msg.classList.add("hidden"); // Hide the error message initially

          btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "Downloading...";
            try {
              // Import the new download function
              const mod = await import("/src/lib/api.ts");
              // Call the new function with the secure fileId
              // The function now returns { blob, filename }
              const { blob, filename } = await mod.downloadConvertedFile(fileId);

              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              // Use the filename returned from the download function (from Content-Disposition header)
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              btn.textContent = `Download again`;
              btn.disabled = false;
              // Optionally, remove the downloaded file from the server via another API call after successful download
            } catch (err) {
              console.error("Download failed:", err);
              btn.textContent = "Download failed";
              btn.classList.add("bg-red-600");
              msg.classList.remove("hidden"); // Show error message
              msg.textContent =
                err.message || "File not found or session expired. Please try converting again.";
            }
          });
        } else {
          // If no fileId is present in the URL, show error message
          btn.classList.add("hidden");
          fileNameDisplay.textContent = ""; // Clear filename display
          msg.classList.remove("hidden");
        }
      }
    </script>
  </section>
</MainLayout>
```

