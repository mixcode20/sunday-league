import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import OrganiserModeProvider from "@/components/OrganiserModeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sunday Powerleague",
  description: "Weekly 7-a-side football organiser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <OrganiserModeProvider>
          <div className="app-shell">
            <SiteNav />
            <main className="app-main">{children}</main>
          </div>
        </OrganiserModeProvider>
      </body>
    </html>
  );
}
