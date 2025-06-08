import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

// Export a Toaster component for global usage
export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return <SonnerToaster position="top-right" richColors {...props} />;
}

// Export the toast API for imperative usage
export const toast = sonnerToast;

// Usage example:
// toast.success('Success message');
// toast.error('Error message');
// toast('Default message');
