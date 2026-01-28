import { Box } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState } from 'react';

interface TabItem {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

export function AnimatedTabs({ tabs, value, onChange, children }: AnimatedTabsProps) {
  const theme = useMuiTheme();
  const isDark = theme.palette.mode === 'dark';
  const [direction, setDirection] = useState(0);

  const handleChange = (newValue: string) => {
    const oldIndex = tabs.findIndex(t => t.value === value);
    const newIndex = tabs.findIndex(t => t.value === newValue);
    setDirection(newIndex > oldIndex ? 1 : -1);
    onChange(newValue);
  };

  return (
    <Box>
      {/* Pill-style tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          p: 0.5,
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#e9ecef',
          borderRadius: 2.5,
          mb: 3,
        }}
      >
        {tabs.map((tab) => (
          <Box
            key={tab.value}
            onClick={() => handleChange(tab.value)}
            sx={{
              flex: 1,
              py: 1,
              px: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              borderRadius: 2,
              fontSize: '0.7rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              bgcolor: value === tab.value 
                ? (isDark ? 'rgba(149, 213, 178, 0.15)' : '#ffffff')
                : 'transparent',
              color: value === tab.value 
                ? (isDark ? '#95d5b2' : '#081c15')
                : (isDark ? 'rgba(255,255,255,0.6)' : '#6c757d'),
              boxShadow: value === tab.value 
                ? (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)')
                : 'none',
              '&:hover': {
                bgcolor: value === tab.value 
                  ? (isDark ? 'rgba(149, 213, 178, 0.15)' : '#ffffff')
                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)'),
              },
            }}
          >
            {tab.icon}
            {tab.label}
          </Box>
        ))}
      </Box>

      {/* Animated content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value}
          initial={{ opacity: 0, x: direction * 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
