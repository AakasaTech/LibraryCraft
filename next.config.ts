import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits over the mobile bottom nav at 375 px.
  devIndicators: false,
  // cacheComponents is off: almost every route reads the auth session, so prerendering buys little.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
