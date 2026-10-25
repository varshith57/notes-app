import { useCallback, useEffect, useRef } from 'react';

/**
 * A function that never changes identity but always runs the latest `fn`. Use it for
 * header buttons: header options that change on every render make react-native-screens
 * re-mount the header buttons, which crashes Android if it happens while the screen is
 * closing ("The specified child already has a parent").
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
