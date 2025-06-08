"use client";

import { JSX } from "react";
import Head from "next/head";
import type { BaseLayoutProps } from "types/common";
import Footer from "@components/ui/common/footer";
import Navbar from "@components/ui/common/navbar";

export default function BaseLayout({ children }: BaseLayoutProps): JSX.Element {
  return (
    <>
      <Head>
        <title>Esdeveniments</title>
        <meta name="description" content="Esdeveniments.cat" />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="alternate"
          title="RSS Feed Esdeveniments.cat"
          type="application/rss+xml"
          href="/rss.xml"
        />
      </Head>
      <Navbar />
      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        {children}
      </div>
      <Footer />
    </>
  );
}
