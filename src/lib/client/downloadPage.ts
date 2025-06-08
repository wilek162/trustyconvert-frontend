interface TaskStatus {
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  progress: number;
}

export function initializeDownloadPage() {
  const taskId = new URLSearchParams(window.location.search).get("id");
  if (!taskId) {
    window.location.href = "/";
    return;
  }

  const progressBar = document.querySelector("[data-progress]");
  if (progressBar instanceof HTMLElement) {
    let pollInterval: ReturnType<typeof setInterval>;

    const updateProgress = async () => {
      try {
        const response = await fetch(`/api/convert/${taskId}/status`);
        const data = (await response.json()) as TaskStatus;

        if (data.status === "completed" || data.status === "failed") {
          window.location.reload();
          clearInterval(pollInterval);
        } else if (data.status === "processing") {
          progressBar.style.width = `${data.progress}%`;
          const progressText =
            progressBar.parentElement?.previousElementSibling?.lastElementChild;
          if (progressText instanceof HTMLElement) {
            progressText.textContent = `${Math.round(data.progress)}%`;
          }
        }
      } catch (error) {
        console.error("Failed to update progress:", error);
      }
    };

    // Poll every 2 seconds
    pollInterval = setInterval(updateProgress, 2000);

    // Cleanup on page unload
    window.addEventListener("unload", () => {
      clearInterval(pollInterval);
    });
  }
}
