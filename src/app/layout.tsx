import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Manifest",
  description: "Web3 intent board — declare what you're building toward",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#080810] text-white font-sans antialiased">
        <AppShell>
          {children}
        </AppShell>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
