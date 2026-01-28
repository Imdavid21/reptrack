import { createTheme, ThemeOptions } from '@mui/material/styles';

// 2026 Refined palette - warm neutrals with subtle depth
const palette = {
  // Warm charcoal tones
  charcoal: {
    main: '#1a1816',
    light: '#2d2926',
    dark: '#0f0d0c',
  },
  // Warm cream
  cream: {
    main: '#faf8f5',
    light: '#ffffff',
    dark: '#f5f2ed',
  },
  // Warm gray scale
  stone: {
    50: '#faf8f5',
    100: '#f5f2ed',
    200: '#e8e4de',
    300: '#d4cfc6',
    400: '#a8a198',
    500: '#787068',
    600: '#565049',
    700: '#423d38',
    800: '#2d2926',
    900: '#1a1816',
  },
  // Accent colors
  accent: {
    warm: '#c9a87c',
    cool: '#7ca3c9',
    success: '#5d9a6e',
    warning: '#d4a843',
    error: '#c66b6b',
  },
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
    },
    h3: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '0.9375rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '0.8125rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.75rem',
      fontWeight: 800,
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.6875rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      fontWeight: 600,
    },
    overline: {
      fontSize: '0.625rem',
      letterSpacing: '0.15em',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '12px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1a1816 0%, #2d2926 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 12,
          minHeight: 40,
          fontSize: '0.8125rem',
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          display: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 10,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 8,
          overflow: 'hidden',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.92)',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: palette.charcoal.main,
      light: palette.charcoal.light,
      dark: palette.charcoal.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.stone[500],
      light: palette.stone[200],
      dark: palette.stone[700],
    },
    error: {
      main: palette.accent.error,
    },
    success: {
      main: palette.accent.success,
      light: '#e8f5ea',
    },
    warning: {
      main: palette.accent.warning,
    },
    background: {
      default: palette.cream.main,
      paper: palette.cream.light,
    },
    text: {
      primary: palette.charcoal.main,
      secondary: palette.stone[500],
    },
    divider: palette.stone[200],
    action: {
      hover: 'rgba(26, 24, 22, 0.04)',
      selected: 'rgba(26, 24, 22, 0.08)',
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: palette.cream.main,
      light: palette.cream.light,
      dark: palette.cream.dark,
      contrastText: palette.charcoal.main,
    },
    secondary: {
      main: palette.stone[400],
      light: palette.stone[300],
      dark: palette.stone[500],
    },
    error: {
      main: '#e88888',
    },
    success: {
      main: '#7db88a',
      light: 'rgba(125, 184, 138, 0.15)',
    },
    warning: {
      main: '#e4b853',
    },
    background: {
      default: '#0c0b0a',
      paper: palette.charcoal.main,
    },
    text: {
      primary: palette.cream.main,
      secondary: palette.stone[400],
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiButton: {
      styleOverrides: {
        root: {
          ...((baseTheme.components?.MuiButton?.styleOverrides?.root as object) || {}),
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #faf8f5 0%, #e8e4de 100%)',
          color: palette.charcoal.main,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0c0b0a',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

export { palette };