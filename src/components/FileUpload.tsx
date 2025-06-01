import React, { useState, useRef } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { convertFile } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError("");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError("");
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

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
      const { filename, blob } = await convertFile(
        file,
        targetFormat,
        setProgress
      );
      // Redirect to download page with filename as query param
      window.location.href = `/download?filename=${encodeURIComponent(filename)}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl border border-primary/10 bg-gradient-to-br from-white via-gray-50 to-primary/10 p-8 animate-in fade-in-0 zoom-in-95 transition-transform duration-300 hover:scale-[1.025] hover:shadow-3xl">
      <CardHeader className="flex flex-col items-center">
        <Avatar className="mb-2 shadow-lg ring-2 ring-primary/30">
          <AvatarImage src="/favicon.svg" alt="Logo" />
        </Avatar>
        <Badge variant="secondary" className="mb-2 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          Secure & Free
        </Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:bg-primary/5 transition"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="*"
            />
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <span className="text-gray-500">
                Click or drag a file here to upload
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="targetFormat" className="font-medium">
              Convert to:
            </label>
            <select
              id="targetFormat"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="mp3">MP3</option>
              {/* Add more formats as needed */}
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="bg-primary text-white rounded px-4 py-2 font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? `Converting... (${progress}%)` : "Convert File"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
