import type { Metadata } from "next";
import { Suspense } from "react";
import { getIntents } from "@/app/actions/intents";
import { FeedSkeleton } from "@/components/skeletons";
import type {
  IntentType,
  Ecosystem,
  Sector,
  IntentPriority,
} from "@/lib/types/database";
import type { IntentSort } from "@/app/actions/intents";
import { FeedClient } from "./feed-client";

interface FeedPageProps {
  searchParams: Promise<{
    type?: string;
    ecosystem?: string;
    sector?: string;
    priority?: string;
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
    priority: (params.priority as IntentPriority) || undefined,
    search: params.search || undefined,
    sort: (params.sort as IntentSort) || undefined,
    page: params.page ? parseInt(params.page, 10) : 0,
    pageSize: 20,
  };

  const { intents, total } = await getIntents(filters);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810]">
      <div className="mx-auto max-w-5xl px-4 py-6">
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
