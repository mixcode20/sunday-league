import type { Metadata } from "next";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import OrganiserModeProvider from "@/components/OrganiserModeProvider";

export const metadata: Metadata = {
  title: "WhatsApp Footy",
  description: "Weekly 7-a-side football organiser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OrganiserModeProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900">
            <SiteNav />
            <main className="mx-auto w-full max-w-5xl px-4 py-6">
              {children}
            </main>
          </div>
        </OrganiserModeProvider>
      </body>
    </html>
  );
}
