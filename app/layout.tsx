import type { Metadata } from "next";
import "./globals.css";
import {MobileWorker} from './mobile-install';
import BrandIntro from './brand-intro';
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#287c60'};

export const metadata: Metadata = {
  title: "Brisa · Tus finanzas, en calma",
  description: "Organiza tus ingresos, gastos, presupuesto y metas personales.",
  manifest:'/manifest.webmanifest',
  appleWebApp:{capable:true,title:'Brisa',statusBarStyle:'default'},
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple:'/icons/brisa-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased"><BrandIntro>{children}</BrandIntro><MobileWorker/></body>
    </html>
  );
}
