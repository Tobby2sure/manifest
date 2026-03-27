import { Suspense } from "react";
import { getIntents } from "@/app/actions/intents";
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
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl bg-[#0e0e14] border border-white/[0.08]"
                />
              ))}
            </div>
          }
        >
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
