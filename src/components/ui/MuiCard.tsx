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
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
      {...props}
    >
      <CardContent sx={{ p: noPadding ? 0 : 2.5, '&:last-child': { pb: noPadding ? 0 : 2.5 } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {icon && (
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 2, 
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.9,
                }}>
                  {icon}
                </Box>
              )}
              <Box>
                {title && (
                  <Typography variant="body1" fontWeight={600}>
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
