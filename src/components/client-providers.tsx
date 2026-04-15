"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Load Providers with ssr:false so Dynamic SDK never runs on the server
// A loading skeleton prevents the "null children" flash
const Providers = dynamic(() => import("./providers"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-surface-page">
      {/* Blank dark screen while Dynamic SDK initialises — prevents flash */}
    </div>
  ),
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
