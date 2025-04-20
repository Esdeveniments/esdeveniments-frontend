import { useEffect, useState } from "react";

const useCheckMobileScreen = (): boolean => {
  const [width, setWidth] = useState<number | undefined>(
    typeof window !== "undefined" ? window.innerWidth : undefined
  );

  const handleWindowSizeChange = (): void => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
    };
  }, []);

  return width !== undefined ? width <= 768 : false;
};

export default useCheckMobileScreen;
