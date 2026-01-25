/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API when available
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 50, 50],
};

/**
 * Trigger haptic feedback if the device supports it
 */
export function haptic(style: HapticStyle = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(PATTERNS[style]);
    } catch (e) {
      // Silently fail if vibration is not supported
    }
  }
}

/**
 * Hook to provide haptic feedback on interactions
 */
export function useHaptic() {
  return {
    light: () => haptic('light'),
    medium: () => haptic('medium'),
    heavy: () => haptic('heavy'),
    success: () => haptic('success'),
    warning: () => haptic('warning'),
    error: () => haptic('error'),
  };
}
