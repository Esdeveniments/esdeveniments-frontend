import { useEffect } from "react";
import { useRouter } from "next/router";
import type { NextPage } from "next";

const Year: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sitemap");
  }, [router]);

  return null;
};

export default Year;
