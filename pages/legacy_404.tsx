import { useEffect } from "react";
import { useRouter } from "next/router";
import type { NextPage } from "next";

const Custom404: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
};

export default Custom404;
