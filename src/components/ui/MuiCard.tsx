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
        bgcolor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        ...sx,
      }}
      {...props}
    >
      <CardContent sx={{ p: noPadding ? 0 : 2, '&:last-child': { pb: noPadding ? 0 : 2 } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {icon && (
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 2, 
                  bgcolor: '#d8f3dc',
                  color: '#081c15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {icon}
                </Box>
              )}
              <Box>
                {title && (
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#081c15' }}>
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
