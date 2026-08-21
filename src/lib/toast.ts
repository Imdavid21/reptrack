// App-wide toast helper backed by `sonner`. The <Toaster /> is mounted once in
// App.tsx. `sonner`'s `toast` is a plain function (not a hook), so importing it
// anywhere - including outside React components - is safe.
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast(message),
};
