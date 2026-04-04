import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#FF6B00",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "FU Corp Command Center",
  description: "Enterprise CRM for FU Corporation — Elite Business Management",
  manifest: "/manifest.json",
  metadataBase: new URL("https://fu-corp-crm.vercel.app"),
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    title: "FU Corp Command Center",
    description: "Enterprise CRM for FU Corporation — Elite Business Management",
    url: "https://fu-corp-crm.vercel.app",
    siteName: "FU Corp Command Center",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FU Corp Command Center" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FU Corp Command Center",
    description: "Enterprise CRM for FU Corporation — Elite Business Management",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FU Corp CRM",
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
