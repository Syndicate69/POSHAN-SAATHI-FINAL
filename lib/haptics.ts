export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors if vibration is not supported or blocked
    }
  }
};

export const hapticLight = () => vibrate(10);
export const hapticMedium = () => vibrate(30);
export const hapticHeavy = () => vibrate(50);
export const hapticSuccess = () => vibrate([10, 50, 30]);
export const hapticError = () => vibrate([50, 50, 50, 50]);
