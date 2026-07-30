import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oreglas = localFont({
  src: "./fonts/OrelegaOne-Regular.ttf",
  variable: "--font-oreglas",
});

const museoModerno = localFont({
  src: "./fonts/MuseoModerno-Regular.ttf",
  variable: "--font-museo-moderno",
});

export const metadata: Metadata = {
  title: "Metis Education Platform",
  description: "Dynamic learning and operational interface setups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`
        ${geistSans.variable} 
        ${geistMono.variable} 
        ${oreglas.variable} 
        ${museoModerno.variable} 
        scroll-smooth
        antialiased
      `}
    >
      <body className="bg-white font-sans">
        {children}
      </body>
    </html>
  );
}