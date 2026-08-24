// App-wide feedback helper backed by `sonner` for actionable failures.
// Routine success/info confirmations are intentionally silent: the resulting
// UI state is the confirmation. Keeping the API stable avoids coupling this
// presentation policy to workout, nutrition, settings, or logging behavior.
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (_message: string) => undefined,
  error: (message: string) => sonnerToast.error(message),
  info: (_message: string) => undefined,
};
