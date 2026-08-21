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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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
      fontSize: '0.75rem',
      textTransform: 'none' as const,
      lineHeight: 1.2,
      fontWeight: 700,
      letterSpacing: '0.08em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          lineHeight: 1.25,
          borderRadius: 12,
          minHeight: 44,
          padding: '10px 16px',
          boxShadow: 'none',
          transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1), border-color 120ms cubic-bezier(0.2, 0, 0, 1), color 120ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:active': { transform: 'scale(0.98)' },
          '&.Mui-disabled': { transform: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.035)',
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
    MuiIconButton: {
      styleOverrides: {
        root: {
          width: 44,
          height: 44,
          transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1), color 120ms cubic-bezier(0.2, 0, 0, 1), transform 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:active': { transform: 'scale(0.96)' },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { minHeight: 44 },
        input: { fontVariantNumeric: 'tabular-nums' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          minHeight: 44,
          fontSize: '0.875rem',
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
          borderRadius: 999,
          minHeight: 32,
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
      main: 'hsl(0 0% 8%)',
      light: palette.black.light,
      dark: palette.black.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: 'hsl(0 0% 38%)',
      light: palette.gray[200],
      dark: palette.gray[600],
    },
    error: {
      main: 'hsl(0 72% 44%)',
    },
    success: {
      main: 'hsl(142 70% 31%)',
      light: 'hsl(142 45% 90%)',
    },
    warning: {
      main: 'hsl(32 95% 32%)',
    },
    info: {
      main: 'hsl(211 90% 40%)',
    },
    background: {
      default: 'hsl(0 0% 97%)',
      paper: '#ffffff',
    },
    text: {
      primary: 'hsl(0 0% 8%)',
      secondary: 'hsl(0 0% 38%)',
    },
    divider: 'hsl(0 0% 86%)',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabledOpacity: 0.5,
    },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: 'hsl(0 0% 96%)',
      light: palette.white.light,
      dark: palette.white.dark,
    },
    secondary: {
      main: 'hsl(0 0% 68%)',
      light: palette.gray[400],
      dark: palette.gray[600],
    },
    error: {
      main: 'hsl(0 82% 68%)',
    },
    success: {
      main: 'hsl(142 55% 62%)',
      light: 'hsl(142 35% 18%)',
    },
    warning: {
      main: 'hsl(38 90% 62%)',
    },
    info: {
      main: 'hsl(210 90% 68%)',
    },
    background: {
      default: 'hsl(0 0% 5%)',
      paper: 'hsl(0 0% 7%)',
    },
    text: {
      primary: 'hsl(0 0% 96%)',
      secondary: 'hsl(0 0% 68%)',
    },
    divider: 'hsl(0 0% 20%)',
    action: {
      hover: 'rgba(255, 255, 255, 0.07)',
      selected: 'rgba(255, 255, 255, 0.12)',
      disabledOpacity: 0.5,
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'hsl(0 0% 5%)',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        },
      },
    },
  },
});

export { palette };
