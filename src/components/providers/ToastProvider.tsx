import * as React from "react";
import { Toaster } from "@/components/ui/toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      {children}
    </>
  );
}
