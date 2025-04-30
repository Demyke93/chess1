
import { toast as sonnerToast } from "@/components/ui/sonner";
import { type ToastProps } from "@radix-ui/react-toast";

// Create a wrapper for toast that supports both the old API (with title/description)
// and the new API (direct string)
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

// Import useToast from Radix UI
const useToast = () => {
  return {
    toast: (props: any) => null,
    dismiss: (toastId?: string) => {},
    toasts: [] as ToastProps[],
  };
};

// Custom toast function that handles both old and new API formats
const toast = (options: string | ToastOptions) => {
  if (typeof options === 'string') {
    return sonnerToast(options);
  } else {
    // Format the toast message for sonner using the old API structure
    const { title, description, variant, duration } = options;
    
    return sonnerToast(description || title || '', {
      description: title && description ? title : undefined,
      duration: duration,
      className: variant === 'destructive' ? 'bg-red-500' : 
                variant === 'success' ? 'bg-green-500' : undefined,
    });
  }
};

export { useToast, toast };
