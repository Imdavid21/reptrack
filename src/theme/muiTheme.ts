import { createTheme, ThemeOptions } from '@mui/material/styles';

// Minimal pastel palette - refined and subtle
const palette = {
  // Primary colors - mint for positive/success
  mint: {
    main: 'hsl(158, 64%, 52%)',
    light: 'hsl(158, 64%, 72%)',
    dark: 'hsl(158, 64%, 42%)',
  },
  // Secondary - lavender for performance/workout
  lavender: {
    main: 'hsl(263, 70%, 76%)',
    light: 'hsl(263, 70%, 86%)',
    dark: 'hsl(263, 60%, 60%)',
  },
  // Accent - coral for energy/calories
  coral: {
    main: 'hsl(15, 80%, 68%)',
    light: 'hsl(15, 80%, 78%)',
    dark: 'hsl(15, 75%, 55%)',
  },
};

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 600,
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
      letterSpacing: '0.1em',
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
          borderRadius: 24,
          padding: '8px 20px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 20,
          minHeight: 40,
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
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
      main: palette.mint.main,
      light: palette.mint.light,
      dark: palette.mint.dark,
    },
    secondary: {
      main: palette.lavender.main,
      light: palette.lavender.light,
      dark: palette.lavender.dark,
    },
    error: {
      main: palette.coral.main,
    },
    background: {
      default: 'hsl(0, 0%, 98%)',
      paper: 'hsl(0, 0%, 100%)',
    },
    text: {
      primary: 'hsl(0, 0%, 10%)',
      secondary: 'hsl(240, 4%, 46%)',
    },
    divider: 'hsl(240, 5%, 90%)',
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
      main: palette.lavender.main,
      light: palette.lavender.light,
      dark: palette.lavender.dark,
    },
    error: {
      main: palette.coral.main,
    },
    background: {
      default: 'hsl(0, 0%, 4%)',
      paper: 'hsl(0, 0%, 8%)',
    },
    text: {
      primary: 'hsl(0, 0%, 100%)',
      secondary: 'hsl(240, 5%, 55%)',
    },
    divider: 'hsl(240, 4%, 20%)',
  },
});

export { palette };
