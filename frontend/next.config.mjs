// Identifies this build so open tabs can detect when a newer version is deployed.
// Vercel gives the commit SHA; elsewhere APP_BUILD_ID can be set, else the build time is used.
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.APP_BUILD_ID ||
  `${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
