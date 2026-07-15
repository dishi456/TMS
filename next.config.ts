import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Standalone output is only for the slim Docker image (the Dockerfile sets
  // BUILD_STANDALONE=1). It is INCOMPATIBLE with running a custom server.js
  // (the Hostinger/Passenger path) and with `next start`, so it stays off
  // otherwise.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker in development to avoid stale-cache headaches.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
