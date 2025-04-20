import { useEffect, useState, useRef, RefObject } from "react";
import { UseOnScreenOptions } from "types/common";

function useOnScreen<T extends Element = Element>(
  ref: RefObject<T>,
  options: UseOnScreenOptions = {}
): boolean {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    freezeOnceVisible = false,
  } = options;
  const [isIntersecting, setIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const frozenRef = useRef(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      console.warn("IntersectionObserver is not supported by this browser.");
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) {
      setIntersecting(false);

      return;
    }
    if (frozenRef.current) return;

    const updateEntry = ([entry]: IntersectionObserverEntry[]) => {
      if (frozenRef.current) return;
      setIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && freezeOnceVisible) {
        frozenRef.current = true;
      }
    };

    // Only pass valid IntersectionObserver options
    const observer = new IntersectionObserver(updateEntry, {
      root,
      rootMargin,
      threshold,
    });
    observerRef.current = observer;
    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
    // Only include primitive, stable values in dependencies
  }, [root, rootMargin, threshold, freezeOnceVisible, ref]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return isIntersecting;
}

export default useOnScreen;
