import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

import CosmicBackground from "@/components/CosmicBackground";
import Navbar from "@/components/Navbar";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://astrolegia.vercel.app"),
  title: {
    default: "Astrolegia — Tu universo astrológico",
    template: "%s | Astrolegia",
  },
  description:
    "Cartas natales, Diseño Humano, Kin Maya, numerología y sinastría en un solo cosmos.",
  applicationName: "Astrolegia",
  // Suite personal: fuera de los índices de búsqueda.
  robots: { index: false, follow: false },
  openGraph: {
    siteName: "Astrolegia",
    title: "Astrolegia — Tu universo astrológico",
    description:
      "Cartas natales, Diseño Humano, Kin Maya, numerología y sinastría en un solo cosmos.",
    url: "/",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Astrolegia" }],
  },
  // favicon.ico / icon.png / apple-icon.png viven en src/app y Next los
  // enlaza solo por convención de archivos — no declarar `icons` acá.
};

export const viewport: Viewport = {
  themeColor: "#03030b",
  colorScheme: "dark",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font variables MUST live on <html>: --font-main/--font-heading are
  // declared at :root and resolve their var() references there — on <body>
  // they arrive too late and the whole font-family falls back to serif.
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AuthProvider>
          <CosmicBackground />
          <Navbar />
          <LayoutContent>
            {children}
          </LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}

