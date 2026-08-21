import { Card, CardContent, CardProps, Typography, Box } from '@mui/material';
import { ReactNode } from 'react';

interface MuiCardProps extends Omit<CardProps, 'title'> {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export function MuiCard({ 
  title, 
  subtitle, 
  icon, 
  action, 
  children, 
  noPadding,
  sx,
  ...props 
}: MuiCardProps) {
  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--elevation-card)',
        ...sx,
      }}
      {...props}
    >
      <CardContent sx={{ p: noPadding ? 0 : 2, '&:last-child': { pb: noPadding ? 0 : 2 } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {icon && (
                <Box sx={{ 
                  width: 32,
                  height: 32,
                  borderRadius: '10px',
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {icon}
                </Box>
              )}
              <Box>
                {title && (
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
            {action}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
