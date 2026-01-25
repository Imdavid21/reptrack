import { toast as sonnerToast } from "sonner";

/**
 * Simplified toast hook using Sonner
 * Maintains backward compatibility with old Radix toast API
 */
export const toast = sonnerToast;

export const useToast = () => ({
  toast,
  toasts: [],
  dismiss: () => {},
});
