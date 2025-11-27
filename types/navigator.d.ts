import { NetworkInformation } from "./common";

// Navigator interface augmentation for network connection properties
// mozConnection and webkitConnection are deprecated but included for broader browser support.
declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}
