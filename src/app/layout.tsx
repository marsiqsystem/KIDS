import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-work-sans" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "KIDS - Kabitirtha Institute of Development & Studies",
  description:
    "A 22-year legacy of educational excellence. Empowering vernacular medium students through Project UDAAN, scholarships, and teacher training across West Bengal.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <SmoothScroll>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
