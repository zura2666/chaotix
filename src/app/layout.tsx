import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RefCapture } from "@/components/RefCapture";
import { Onboarding } from "@/components/Onboarding";
import { Providers } from "@/components/Providers";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { MainLayout } from "@/components/MainLayout";
import { MatrixBackground } from "@/components/MatrixBackground";
import { GhostChartBackground } from "@/components/GhostChartBackground";
import { Toaster } from "sonner";
import { SocketProvider } from "@/components/providers/SocketProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Chaotix — Trade Nothing. Trade Everything.",
  description: "Trade strings. Attention and speculation, not real assets.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased text-slate-400 bg-black overflow-x-hidden flex flex-col min-h-screen`}
      >
        <MatrixBackground />
        <SocketProvider>
          <Providers>
            <AuthModalProvider>
              <RefCapture />
              <Header />
              <Onboarding />
              <main className="relative min-h-screen flex-1 overflow-hidden">
                <GhostChartBackground />
                <MainLayout>{children}</MainLayout>
              </main>
              <Footer />
            </AuthModalProvider>
            <Toaster theme="dark" position="top-center" />
            <div id="auth-modal-portal" />
          </Providers>
        </SocketProvider>
      </body>
    </html>
  );
}
