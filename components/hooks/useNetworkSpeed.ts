import { useState, useEffect } from "react";

export const useNetworkSpeed = (): number => {
  const [quality, setQuality] = useState<number>(70); // Default quality

  useEffect(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (!connection) {
      console.log("Network Information API not supported");
      setQuality(70);
      return;
    }

    const handleConnectionChange = () => {
      switch (connection.effectiveType) {
        case "slow-2g":
        case "2g":
          setQuality(30);
          break;
        case "3g":
          setQuality(50);
          break;
        case "4g":
          setQuality(80);
          break;
        case "wifi":
          setQuality(100);
          break;
        default:
          setQuality(70);
      }
    };

    handleConnectionChange();

    connection.addEventListener("change", handleConnectionChange);

    return () => {
      connection.removeEventListener("change", handleConnectionChange);
    };
  }, []);

  return quality;
};
