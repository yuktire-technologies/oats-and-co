/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "cloudinary",
    "resend",
  ],
};

export default nextConfig;



