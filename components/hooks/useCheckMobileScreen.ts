import { useEffect, useState } from "react";

const useCheckMobileScreen = (): boolean => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  const handleWindowSizeChange = (): void => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    // Set initial width and mark as mounted
    setWidth(window.innerWidth);
    setHasMounted(true);

    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
    };
  }, []);

  // Return false during SSR and initial render to prevent hydration mismatch
  // Only return actual mobile detection after client-side mount
  if (!hasMounted) {
    return false;
  }

  return width !== undefined ? width <= 768 : false;
};

export default useCheckMobileScreen;
