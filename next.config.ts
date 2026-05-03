import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-hosted rsync-Deploy (siehe deploy-path.sh): ein Node-Prozess auf dem Server.
  output: "standalone"
};

export default nextConfig;
