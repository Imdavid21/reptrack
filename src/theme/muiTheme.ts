import { createTheme, ThemeOptions } from '@mui/material/styles';

// Black & White palette - pure grayscale
const palette = {
  black: {
    main: '#050505',
    light: '#0f0f0f',
    dark: '#000000',
  },
  white: {
    main: '#f5f5f5',
    light: '#ffffff',
    dark: '#e5e5e5',
  },
  gray: {
    50: '#fafafa',
    100: '#f0f0f0',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#1a1a1a',
    900: '#0f0f0f',
    950: '#050505',
  },
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.12,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.18,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.25,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 700,
      lineHeight: 1.35,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.45,
    },
    caption: {
      fontSize: '0.75rem',
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
      fontWeight: 500,
      lineHeight: 1.35,
    },
    overline: {
      fontSize: '0.6875rem',
      lineHeight: 1.2,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          lineHeight: 1.25,
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          minHeight: 36,
          fontSize: '0.75rem',
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
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
        },
        track: {
          borderRadius: 12,
        },
        thumb: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
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
      main: palette.black.main,
      light: palette.black.light,
      dark: palette.black.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.gray[400],
      light: palette.gray[200],
      dark: palette.gray[600],
    },
    error: {
      main: palette.gray[700],
    },
    success: {
      main: palette.gray[600],
      light: palette.gray[200],
    },
    background: {
      default: palette.gray[50],
      paper: '#ffffff',
    },
    text: {
      primary: palette.black.main,
      secondary: palette.gray[500],
    },
    divider: palette.gray[200],
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: palette.white.main,
      light: palette.white.light,
      dark: palette.white.dark,
    },
    secondary: {
      main: palette.gray[500],
      light: palette.gray[400],
      dark: palette.gray[600],
    },
    error: {
      main: palette.gray[400],
    },
    success: {
      main: palette.gray[400],
      light: 'rgba(255, 255, 255, 0.06)',
    },
    background: {
      default: palette.black.main,
      paper: palette.gray[900],
    },
    text: {
      primary: palette.white.main,
      secondary: palette.gray[400],
    },
    divider: 'rgba(255, 255, 255, 0.06)',
    action: {
      hover: 'rgba(255, 255, 255, 0.03)',
      selected: 'rgba(255, 255, 255, 0.06)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.black.main,
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

export { palette };
