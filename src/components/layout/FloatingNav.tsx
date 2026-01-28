import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, Sparkles, History, Settings } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Today' },
  { path: '/log', icon: Dumbbell, label: 'Workout' },
  { path: '/insights', icon: Sparkles, label: 'Insights' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function FloatingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const getCurrentIndex = () => {
    return navItems.findIndex(item => 
      item.path === currentPath || 
      (item.path !== '/' && currentPath.startsWith(item.path))
    );
  };

  const currentIndex = getCurrentIndex();

  const handleNavigation = (path: string) => {
    haptic('light');
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe-bottom pointer-events-none">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
        className="mb-4 mx-4 pointer-events-auto"
      >
        <div 
          className={cn(
            "flex items-center gap-1 p-1.5 rounded-full",
            "bg-card/80 backdrop-blur-xl",
            "border border-border/50",
            "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
            "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          )}
        >
          {navItems.map((item, index) => {
            const isActive = index === currentIndex || (index === 0 && currentIndex === -1);
            const Icon = item.icon;

            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-all duration-300",
                  isActive 
                    ? "w-[72px] h-11 bg-primary text-primary-foreground" 
                    : "w-11 h-11 text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                whileTap={{ scale: 0.92 }}
                layout
              >
                <Icon size={20} className="relative z-10" />
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-1.5 text-xs font-semibold overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}