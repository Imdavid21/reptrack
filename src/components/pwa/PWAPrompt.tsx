import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

    useEffect(() => {
        // Check if running in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        if (isStandalone) return;

        // Check flags
        const justSignedUp = localStorage.getItem('just_signed_up') === 'true';
        const isDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

        if (justSignedUp && !isDismissed) {
            // Detect platform
            const userAgent = window.navigator.userAgent.toLowerCase();
            if (/iphone|ipad|ipod/.test(userAgent)) {
                setPlatform('ios');
            } else if (/android/.test(userAgent)) {
                setPlatform('android');
            }

            // Delay showing to let the dashboard load first
            setTimeout(() => setShowPrompt(true), 1500);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
        localStorage.removeItem('just_signed_up'); // Clear sign up flag so it doesn't trigger again
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 md:left-auto md:right-8 md:w-96 md:bottom-4"
                >
                    <div className="bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-4 relative overflow-hidden">
                        {/* Glossy effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Install App</h3>
                                    <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
                                </div>
                            </div>

                            <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                                {platform === 'ios' ? (
                                    <div className="space-y-2">
                                        <p className="flex items-center gap-2">
                                            1. Tap the <Share size={14} className="text-blue-500" /> Share button below
                                        </p>
                                        <p className="flex items-center gap-2">
                                            2. Select <PlusSquare size={14} /> <strong>Add to Home Screen</strong>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p>
                                            Tap the menu icon (⋮) and select <strong>Add to Home screen</strong> or <strong>Install App</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button size="sm" variant="secondary" onClick={handleDismiss} className="w-full">
                                Got it
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
