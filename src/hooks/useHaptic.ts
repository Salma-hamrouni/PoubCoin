import { useCallback } from 'react';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess, hapticError, hapticWarning } from '../utils/haptics';

/**
 * Returns haptic preset functions bound to the global hapticsEnabled flag.
 * Prefer this over importing haptic* functions directly in new screens.
 *
 * Usage:
 *   const { tap, success, error } = useHaptic();
 *   <TouchableOpacity onPress={() => { tap(); doAction(); }} />
 */
export function useHaptic() {
  return {
    tap:     useCallback(hapticLight,   []),
    medium:  useCallback(hapticMedium,  []),
    heavy:   useCallback(hapticHeavy,   []),
    success: useCallback(hapticSuccess, []),
    error:   useCallback(hapticError,   []),
    warning: useCallback(hapticWarning, []),
  };
}
