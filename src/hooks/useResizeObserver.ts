import { useCallback, useEffect, useRef, useState } from 'react';
import { Size } from 'src/types';

export const useResizeObserver = (el?: HTMLElement | null) => {
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const disconnect = useCallback(() => {
    resizeObserverRef.current?.disconnect();
  }, []);

  const observe = useCallback(
    (element: HTMLElement) => {
      disconnect();

      resizeObserverRef.current = new ResizeObserver(() => {
        setSize({
          width: element.clientWidth,
          height: element.clientHeight
        });
      });

      resizeObserverRef.current.observe(element);
    },
    [disconnect]
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (el) {
      observe(el);
    } else {
      // When the watched element transitions from set to null (e.g. a
      // ref-callback receives null on unmount of the observed subtree),
      // tear down the previous observer instead of leaving it bound to
      // the now-stale element. Without this, the prior observer
      // outlived the rebinding and only got cleaned up on the consumer
      // unmounting.
      disconnect();
    }
  }, [observe, el, disconnect]);

  return {
    size,
    disconnect,
    observe
  };
};
