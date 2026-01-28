import { createTheme, ThemeOptions } from '@mui/material/styles';

// Refined palette based on user colors
// #081c15 - Dark forest green (primary text, dark accents)
// #95d5b2 - Medium mint (primary accent, charts)
// #d8f3dc - Light mint (success backgrounds)
// #e9ecef - Light gray (borders, card backgrounds)
// #f8f9fa - Near white (page background)
const palette = {
  forest: {
    main: '#081c15', // Primary text, headers
    light: '#1a3a2a',
    dark: '#040e0a',
  },
  mint: {
    main: '#95d5b2', // Primary accent, charts, positive
    light: '#d8f3dc', // Success backgrounds
    dark: '#74c69d',
  },
  gray: {
    50: '#f8f9fa', // Page background
    100: '#e9ecef', // Card borders, dividers
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d', // Secondary text
  },
  warning: {
    main: '#ff8a65', // Warnings, negative trends
    light: 'rgba(255, 138, 101, 0.15)',
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
      main: palette.forest.main,
      light: palette.forest.light,
      dark: palette.forest.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.mint.main,
      light: palette.mint.light,
      dark: palette.mint.dark,
    },
    error: {
      main: palette.warning.main,
    },
    success: {
      main: palette.mint.main,
      light: palette.mint.light,
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: palette.forest.main,
      secondary: palette.gray[500],
    },
    divider: palette.gray[100],
    action: {
      hover: 'rgba(149, 213, 178, 0.08)',
      selected: 'rgba(149, 213, 178, 0.12)',
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: palette.mint.main,
      light: palette.mint.light,
      dark: palette.mint.dark,
    },
    secondary: {
      main: palette.mint.main,
      light: palette.mint.light,
      dark: palette.mint.dark,
    },
    error: {
      main: palette.warning.main,
    },
    success: {
      main: palette.mint.main,
      light: 'rgba(149, 213, 178, 0.2)',
    },
    background: {
      default: '#0a1f14', // Darker forest
      paper: '#122a1c', // Slightly lighter forest
    },
    text: {
      primary: '#f8f9fa',
      secondary: '#adb5bd',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    action: {
      hover: 'rgba(149, 213, 178, 0.12)',
      selected: 'rgba(149, 213, 178, 0.16)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a1f14',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

export { palette };
