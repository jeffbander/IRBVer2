import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Research Study Management",
  description: "Professional IRB and clinical study management system",
  keywords: ["research", "IRB", "clinical trials", "study management", "healthcare"],
  authors: [{ name: "Research Study Management Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0F4C75",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}