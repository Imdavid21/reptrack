import { ReactNode } from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, MotionProps } from 'framer-motion';

interface GlassCardProps extends Omit<BoxProps, 'component'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  animate?: boolean;
  motionProps?: MotionProps;
}

export function GlassCard({ 
  children, 
  variant = 'default',
  animate = false,
  motionProps,
  sx,
  ...props 
}: GlassCardProps) {
  const variantStyles = {
    default: {
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    },
    elevated: {
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    },
    subtle: {
      bgcolor: 'action.hover',
      border: 0,
      boxShadow: 'none',
    },
  };

  const content = (
    <Box
      sx={{
        borderRadius: 4,
        p: 2.5,
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
        ...variantStyles[variant],
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        {...motionProps}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Stat card variant with glass effect
interface GlassStatProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function GlassStat({ label, value, unit, icon, trend, trendValue }: GlassStatProps) {
  const trendColor = trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary';

  return (
    <GlassCard variant="subtle" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Box 
              component="span" 
              sx={{ 
                fontSize: '1.75rem', 
                fontWeight: 800, 
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </Box>
            {unit && (
              <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {unit}
              </Box>
            )}
          </Box>
          <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Box>
          {trendValue && (
            <Box sx={{ fontSize: '0.65rem', color: trendColor, mt: 0.25 }}>
              {trendValue}
            </Box>
          )}
        </Box>
        {icon && (
          <Box sx={{ color: 'text.secondary', opacity: 0.5 }}>
            {icon}
          </Box>
        )}
      </Box>
    </GlassCard>
  );
}