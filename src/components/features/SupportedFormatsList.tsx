import React from "react";
import { useSupportedFormats } from "@/lib/hooks/useFileUpload";

export default function SupportedFormatsList() {
  const { formats, loading, error } = useSupportedFormats();
  if (loading) return <div>Loading formats...</div>;
  if (error) return <div>{error}</div>;
  const safeFormats = Array.isArray(formats) ? formats : [];
  return (
    <ul style={{ padding: 0, listStyle: "none" }}>
      {safeFormats.map((f) => (
        <li key={f.id} style={{ marginBottom: 12 }}>
          <b>{f.name}</b> (<code>{f.inputFormats.join(", ")}</code>) →
          <span style={{ marginLeft: 4 }}>{f.outputFormats.join(", ")}</span>
        </li>
      ))}
    </ul>
  );
} 