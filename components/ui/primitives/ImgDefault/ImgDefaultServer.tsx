import ImgDefaultCore from "./ImgDefaultCore";
import { ImgDefaultProps } from "types/common";

const ImgDefaultServer: React.FC<ImgDefaultProps> = (props) => {
  return <ImgDefaultCore {...props} />;
};

export default ImgDefaultServer;
