import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';

const palette = {
  black: { main: '#090a0b', light: '#151719', dark: '#000000' },
  white: { main: '#f7f8f8', light: '#ffffff', dark: '#e9ebeb' },
  gray: {
    50: '#f6f7f6', 100: '#eef0ef', 200: '#e1e4e2', 300: '#ced2cf',
    400: '#9ca39e', 500: '#707873', 600: '#505752', 700: '#383e3a',
    800: '#202421', 900: '#121512', 950: '#090b09',
  },
  energy: '#64ad72',
};

const systemFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif';

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: systemFont,
    h1: { fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.06, fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontSize: 'clamp(1.35rem, 3vw, 1.8rem)', lineHeight: 1.12, fontWeight: 720, letterSpacing: '-0.025em' },
    h3: { fontSize: '1.125rem', lineHeight: 1.2, fontWeight: 680, letterSpacing: '-0.015em' },
    h4: { fontSize: '1rem', fontWeight: 650 },
    h5: { fontSize: '0.875rem', fontWeight: 650 },
    h6: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.6875rem', lineHeight: 1.35, letterSpacing: '0.035em', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 16,
          padding: '10px 18px',
          fontWeight: 650,
          transition: 'transform 100ms ease-out, background-color 160ms ease, box-shadow 160ms ease',
          '&:active': { transform: 'scale(0.97)' },
          '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
        },
        sizeLarge: { minHeight: 54, borderRadius: 18, padding: '13px 24px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: '1px solid',
          borderColor: 'rgba(128, 128, 128, 0.14)',
          backgroundImage: 'none',
          boxShadow: '0 16px 44px rgba(0, 0, 0, 0.07)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 20, backgroundImage: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: 'calc(100% - 32px)',
          maxHeight: '88dvh',
          borderRadius: 28,
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.28)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          minWidth: 52,
          borderRadius: 14,
          padding: '9px 14px',
          fontSize: '0.75rem',
          fontWeight: 620,
          transition: 'background-color 160ms ease, color 160ms ease, transform 100ms ease',
          '&:active': { transform: 'scale(0.97)' },
          '&.Mui-selected': { fontWeight: 720 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 46, padding: 3, borderRadius: 17 },
        indicator: { display: 'none' },
        flexContainer: { gap: 2 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { minHeight: 30, borderRadius: 12, fontWeight: 620 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 8 },
        bar: { borderRadius: 8 },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: 14 },
        thumb: { boxShadow: '0 2px 7px rgba(0,0,0,0.22)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 16,
          transition: 'box-shadow 160ms ease, background-color 160ms ease',
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(palette.energy, 0.18)}` },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { transition: 'background-color 240ms ease, color 240ms ease' },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: { main: palette.black.main, contrastText: '#ffffff' },
    secondary: { main: palette.gray[500] },
    error: { main: '#cf5c61' },
    success: { main: palette.energy },
    background: { default: palette.gray[50], paper: 'rgba(255,255,255,0.92)' },
    text: { primary: palette.black.main, secondary: palette.gray[500] },
    divider: alpha(palette.black.main, 0.09),
    action: { hover: alpha(palette.black.main, 0.045), selected: alpha(palette.energy, 0.13) },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: { main: palette.white.main, contrastText: palette.black.main },
    secondary: { main: palette.gray[400] },
    error: { main: '#ee8c91' },
    success: { main: '#82c58d' },
    background: { default: '#070908', paper: 'rgba(18,21,18,0.92)' },
    text: { primary: palette.white.main, secondary: palette.gray[400] },
    divider: alpha(palette.white.main, 0.1),
    action: { hover: alpha(palette.white.main, 0.055), selected: alpha('#82c58d', 0.14) },
  },
});

export { palette };
