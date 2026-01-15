import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MainLayout } from "@/components/layout";
import { Toaster } from "react-hot-toast";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PresenceBeacon } from "@/components/PresenceBeacon";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3B82F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1E40AF" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Live Clipboard",
  description: "Decentralized P2P clipboard sharing application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Live Clipboard",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

// Disable static generation for pages that use browser APIs
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/runtime-env.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ErrorBoundary>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:shadow-lg"
            >
              Skip to main content
            </a>
            <MainLayout>{children}</MainLayout>
          </ErrorBoundary>
          <PresenceBeacon />
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(142, 76%, 36%)',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(0, 84%, 60%)',
                  secondary: 'white',
                },
              },
            }}
          />
          <OfflineIndicator />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
