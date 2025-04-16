import React, { useRef, useEffect, useState } from "react";

interface UseOnScreenOptions extends Omit<IntersectionObserverInit, "rootMargin"> {
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

function useOnScreen<T extends Element>(
  ref: React.RefObject<T | null>,
  options: UseOnScreenOptions = {}
): boolean {
  const { rootMargin = "0px", freezeOnceVisible = false, ...restOptions } = options;
  const [isIntersecting, setIntersecting] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const frozenRef = useRef<boolean>(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      console.warn("IntersectionObserver is not supported by this browser.");
      return setIntersecting(false);
    }

    const currentRef = ref.current;
    if (!currentRef) {
      setIntersecting(false);
      return;
    }

    const updateEntry = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (frozenRef.current) {
        return;
      }

      setIntersecting(entry.isIntersecting);

      if (entry.isIntersecting && freezeOnceVisible) {
        frozenRef.current = true;
      }
    };

    const observerParams: IntersectionObserverInit = {
      rootMargin,
      ...restOptions,
    };

    const observer = new IntersectionObserver(updateEntry, observerParams);
    observerRef.current = observer;

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin, freezeOnceVisible, restOptions]);

  return isIntersecting;
}

export default useOnScreen;
