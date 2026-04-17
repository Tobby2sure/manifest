import type { Metadata } from "next";
import { Suspense } from "react";
import { getIntents } from "@/app/actions/intents";
import { FeedSkeleton } from "@/components/skeletons";
import type {
  IntentType,
  Ecosystem,
  Sector,
  IntentSort,
} from "@/lib/types/database";
import { FeedClient } from "./feed-client";

interface FeedPageProps {
  searchParams: Promise<{
    type?: string;
    ecosystem?: string;
    sector?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export const metadata: Metadata = { title: 'Explore Intents' };

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;

  const filters = {
    type: (params.type as IntentType) || undefined,
    ecosystem: (params.ecosystem as Ecosystem) || undefined,
    sector: (params.sector as Sector) || undefined,
    search: params.search || undefined,
    sort: (params.sort as IntentSort) || undefined,
    page: params.page ? parseInt(params.page, 10) : 0,
    pageSize: 20,
  };

  const { intents, total } = await getIntents(filters);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background relative">
      <div className="noise-overlay" />
      <div className="hero-mesh absolute inset-x-0 top-0 h-80 pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Suspense fallback={<FeedSkeleton />}>
          <FeedClient
            intents={intents}
            total={total}
            initialFilters={filters}
          />
        </Suspense>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
