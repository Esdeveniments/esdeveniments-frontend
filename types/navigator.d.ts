// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NetworkInformation } from "./common";

// mozConnection and webkitConnection are deprecated but included for broader browser support.
declare global {
  interface Navigator {
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}
