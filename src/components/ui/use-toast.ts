import { toast } from "sonner";

// Re-export Sonner's toast for backward compatibility
export { toast };

// Dummy useToast for backward compatibility with old Radix imports
export const useToast = () => ({
  toast,
  toasts: [],
  dismiss: () => {},
});
