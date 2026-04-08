import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // safe-area-inset support for notched devices
};

export const metadata: Metadata = {
  title: "Alpha Command Center",
  description: "Enterprise CRM powered by Alpha AI",
  manifest: "/manifest.json",
  metadataBase: new URL("https://fu-corp-crm.vercel.app"),
  icons: {
    icon: [
      { url: "/mascot-32.png", sizes: "32x32", type: "image/png" },
      { url: "/mascot-192.png", sizes: "192x192", type: "image/png" },
      { url: "/mascot-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/mascot-192.png",
  },
  openGraph: {
    type: "website",
    title: "Alpha Command Center",
    description: "Enterprise CRM powered by Alpha AI",
    url: "https://fu-corp-crm.vercel.app",
    siteName: "Alpha Command Center",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Alpha Command Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alpha Command Center",
    description: "Enterprise CRM powered by Alpha AI",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alpha Command Center",
  },
  alternates: {
    canonical: "https://fu-corp-crm.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen antialiased`}>
        {children}
        <PWAInstallPrompt />
        <Analytics />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
      </body>
    </html>
  );
}
