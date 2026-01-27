import { Tabs, Tab, Box, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const [direction, setDirection] = useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
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
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderRadius: 3,
          mb: 3,
        }}
      >
        {tabs.map((tab) => (
          <Box
            key={tab.value}
            onClick={(e) => handleChange(e, tab.value)}
            sx={{
              flex: 1,
              py: 1,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              cursor: 'pointer',
              borderRadius: 2.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              bgcolor: value === tab.value 
                ? 'background.paper' 
                : 'transparent',
              color: value === tab.value 
                ? 'text.primary' 
                : 'text.secondary',
              boxShadow: value === tab.value 
                ? '0 2px 8px rgba(0,0,0,0.08)' 
                : 'none',
              '&:hover': {
                bgcolor: value === tab.value 
                  ? 'background.paper' 
                  : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
          initial={{ opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
