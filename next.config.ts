import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.30.6", "192.168.30.*", "localhost:3000"],
};

export default nextConfig;