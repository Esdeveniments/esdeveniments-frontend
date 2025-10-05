import { JSX } from "react";

export default function LoadingScreen(): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-whiteCorp">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-bColor"></div>
    </div>
  );
}
