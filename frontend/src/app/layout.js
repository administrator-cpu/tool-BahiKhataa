import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./common/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Ensures text is visible during font load
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// 1. Separate Viewport Export (Next.js 14+ Best Practice)
export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// 2. Comprehensive SEO Metadata
export const metadata = {
  metadataBase: new URL("https://yourdomain.com"), // Crucial for OG images to work
  title: {
    default: "BahiKhata - Digital Ledger for Modern Business",
    template: "%s | BahiKhata", // Child pages will look like "Features | BahiKhata"
  },
  description:
    "Replace manual ledgers with a secure Maker-Checker system. Track dues, manage aging reports, and verify payments in real-time.",
  keywords: [
    "digital ledger",
    "bahi khata",
    "fintech",
    "accounting software",
    "maker checker",
  ],
  authors: [{ name: "Your Name or Company" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yourdomain.com",
    siteName: "BahiKhata",
    title: "BahiKhata - Digital Ledger for Modern Business",
    description: "Replace manual ledgers with a secure Maker-Checker system.",
    images: [
      {
        url: "/og-image.jpg", // Create a 1200x630 image in your /public folder
        width: 1200,
        height: 630,
        alt: "BahiKhata Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BahiKhata - Digital Ledger for Modern Business",
    description: "Replace manual ledgers with a secure Maker-Checker system.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
      </body>
    </html>
  );
}
