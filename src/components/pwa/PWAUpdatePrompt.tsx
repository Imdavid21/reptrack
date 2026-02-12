import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleUpdate = () => {
    // reload: true tells the SW to skipWaiting + clients.claim, then reloads
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-8 md:w-80"
        >
          <div className="bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-4 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <RefreshCw size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Update Available</h3>
                <p className="text-xs text-muted-foreground">A new version is ready</p>
              </div>
            </div>
            <Button size="sm" onClick={handleUpdate} className="w-full">
              Update Now
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
