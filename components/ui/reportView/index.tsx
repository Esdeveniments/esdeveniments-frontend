import { useEffect, FC } from "react";
import { env } from "@utils/helpers";
import { ReportViewProps } from '../../../types/props';

const ReportView: FC<ReportViewProps> = ({ slug }) => {
  useEffect(() => {
    if (env === "prod") {
      fetch("/api/reportView", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });
    }
  }, [slug]);

  return null;
};

export default ReportView;
