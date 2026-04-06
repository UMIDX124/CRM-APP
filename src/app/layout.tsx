import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "DP Command Center",
  description: "Enterprise CRM powered by Alpha AI",
  manifest: "/manifest.json",
  metadataBase: new URL("https://fu-corp-crm.vercel.app"),
  icons: {
    icon: [
      { url: "/wolf-32.png", sizes: "32x32", type: "image/png" },
      { url: "/wolf-192.png", sizes: "192x192", type: "image/png" },
      { url: "/wolf-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/wolf-192.png",
  },
  openGraph: {
    type: "website",
    title: "DP Command Center",
    description: "Enterprise CRM powered by Alpha AI",
    url: "https://fu-corp-crm.vercel.app",
    siteName: "DP Command Center",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DP Command Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DP Command Center",
    description: "Enterprise CRM powered by Alpha AI",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DP Command Center",
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
