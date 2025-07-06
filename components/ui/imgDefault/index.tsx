"use client";

import { memo, FC } from "react";
import ImgDefaultCore from "./ImgDefaultCore";
import { ImgDefaultProps } from "types/common";

const ImgDefault: FC<ImgDefaultProps> = (props) => {
  return <ImgDefaultCore {...props} />;
};

export default memo(ImgDefault);
