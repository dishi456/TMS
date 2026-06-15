import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  output: "standalone", // required for the slim Docker image
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker in development to avoid stale-cache headaches.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
