import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Watermark } from "@/components/brand";
import { themeInitScript } from "@/components/theme";
import { ServiceWorker } from "@/components/ServiceWorker";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Alya's Green Space", template: "%s · Alya's Green Space" },
  description: "Journal · Goals · Finance · Habits · Reflection — A little progress, every day. Ciptaan Ringga.",
  applicationName: "Alya's Green Space",
  authors: [{ name: "Ringga" }],
  creator: "Ringga",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Green Space", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f5ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ToastProvider>
          {children}
          <MusicPlayer />
          <Watermark />
          <ServiceWorker />
        </ToastProvider>
      </body>
    </html>
  );
}
