import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Source maps are only fetched when devtools are open, so this costs build
  // time and deploy weight rather than load performance. Opt in when needed:
  // NEXT_BROWSER_SOURCE_MAPS=true npm run build
  productionBrowserSourceMaps: process.env.NEXT_BROWSER_SOURCE_MAPS === "true",
};

export default nextConfig;
