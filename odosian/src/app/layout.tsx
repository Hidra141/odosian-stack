import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Odosian — AI-Powered SIEM Detection Engine",
  description:
    "Analyze, enhance, and generate Elastic SIEM detection rules with AI-driven insights, MITRE ATT&CK mapping, and evasion risk analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
