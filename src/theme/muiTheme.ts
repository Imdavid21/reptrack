import { createTheme, ThemeOptions } from '@mui/material/styles';

// Black & White palette - pure grayscale
const palette = {
  black: {
    main: '#171717',
    light: '#262626',
    dark: '#0a0a0a',
  },
  white: {
    main: '#fafafa',
    light: '#ffffff',
    dark: '#f5f5f5',
  },
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '0.75rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.75rem',
    },
    caption: {
      fontSize: '0.625rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      fontWeight: 500,
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
      main: '#dc2626',
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
      main: '#ef4444',
    },
    success: {
      main: palette.gray[400],
      light: 'rgba(255, 255, 255, 0.1)',
    },
    background: {
      default: palette.gray[900],
      paper: palette.gray[800],
    },
    text: {
      primary: palette.white.main,
      secondary: palette.gray[400],
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.gray[900],
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

export { palette };
