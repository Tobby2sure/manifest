"use client";

import type { Intent } from "@/lib/types/database";

interface IntentCardProps {
  intent: Intent;
}

export function IntentCard({ intent }: IntentCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
          {intent.type}
        </span>
        <span className="text-sm text-muted-foreground">{intent.ecosystem}</span>
        <span className="text-sm text-muted-foreground">{intent.sector}</span>
      </div>
      <p className="text-sm">{intent.content}</p>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>{intent.priority}</span>
        <span>·</span>
        <span>{intent.lifecycle_status}</span>
      </div>
    </div>
  );
}
