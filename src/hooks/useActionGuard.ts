import { useRef, useCallback } from 'react';

/**
 * Custom hook to guard critical action execution against rapid double-clicks.
 * @param delayMs Minimum cooldown in milliseconds (default: 500ms)
 */
export function useActionGuard(delayMs: number = 500) {
  const isProcessingRef = useRef<boolean>(false);

  const executeGuarded = useCallback(<T extends (...args: any[]) => any>(actionFn: T) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (isProcessingRef.current) {
        return undefined;
      }
      isProcessingRef.current = true;

      try {
        const result = await actionFn(...args);
        return result;
      } finally {
        setTimeout(() => {
          isProcessingRef.current = false;
        }, delayMs);
      }
    };
  }, [delayMs]);

  return { executeGuarded, isProcessingRef };
}
