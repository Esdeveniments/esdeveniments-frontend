import { JSX, memo } from "react";

function CardLoading(): JSX.Element {
  return (
    <div className="flex flex-col justify-center bg-background overflow-hidden cursor-pointer mb-10">
      {/* Title */}
      <div className="bg-background h-fit flex justify-between items-center gap-2 pr-4">
        <div className="flex justify-start items-center gap-0 pt-[2px] m-0">
          <div className="w-2 h-6 bg-gradient-to-r from-primary to-primary-dark"></div>
        </div>
        {/* Title */}
        <div className="w-9/12 flex justify-start items-center animate-fast-pulse">
          <div className="w-2/3 h-5 bg-muted rounded-xl"></div>
        </div>
        {/* WeatherIcon */}
        <div className="w-2/12 flex justify-center animate-fast-pulse">
          <div className="w-4 h-4 bg-muted opacity-50 rounded-xl"></div>
        </div>
      </div>
      {/* ImageEvent */}
      <div className="p-2 flex justify-center items-center">
        <div className="w-full h-60 bg-muted m-2 animate-fast-pulse"></div>
      </div>
      {/* Info */}
      {/* InfoEvent */}
      <div className="bg-background flex flex-col px-2 pt-4 gap-4">
        {/* Date */}
        <div className="bg-muted w-2/3 h-5 pl-1 rounded-xl animate-fast-pulse"></div>
        {/* Location */}
        <div className="w-full h-full flex items-start animate-fast-pulse">
          <div className="h-4 w-4 bg-muted rounded-xl"></div>
          <div className="w-full h-full flex flex-col justify-center items-start px-2 gap-2">
            <div className="w-2/3 my-1 bg-muted h-3 rounded-xl"></div>
            <div className="w-2/3 my-1 bg-muted h-3 rounded-xl"></div>
          </div>
        </div>
        {/* hour */}
        <div className="w-full h-full flex items-start animate-fast-pulse">
          <div className="h-4 w-4 bg-muted rounded-xl"></div>
          <div className="w-full h-full flex flex-col justify-center items-start px-2 gap-2">
            <div className="w-2/3 my-1 bg-muted h-3 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CardLoading);
