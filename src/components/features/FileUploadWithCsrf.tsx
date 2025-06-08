import React from "react";
import { CsrfProvider } from "@/components/providers/CsrfProvider";
import FileUpload from "./FileUpload";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function FileUploadWithCsrf() {
  return (
    <CsrfProvider>
      <TooltipProvider>
        <FileUpload />
      </TooltipProvider>
    </CsrfProvider>
  );
}