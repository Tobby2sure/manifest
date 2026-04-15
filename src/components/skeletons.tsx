export function IntentCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-card p-4 animate-pulse" role="status" aria-label="Loading intent card">
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="size-9 rounded-full bg-white/6" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-white/6" />
          <div className="h-3 w-20 rounded bg-white/4" />
        </div>
      </div>
      {/* Type badge */}
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 rounded-lg bg-white/6" />
        <div className="h-5 w-14 rounded-lg bg-white/6" />
      </div>
      {/* Content lines */}
      <div className="space-y-2 mb-3">
        <div className="h-3.5 w-full rounded bg-white/6" />
        <div className="h-3.5 w-full rounded bg-white/6" />
        <div className="h-3.5 w-3/4 rounded bg-white/4" />
      </div>
      {/* Tags */}
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-16 rounded-lg bg-white/4" />
        <div className="h-5 w-14 rounded-lg bg-white/4" />
      </div>
      {/* Footer */}
      <div className="pt-3 border-t border-white/6 flex justify-between">
        <div className="h-3 w-32 rounded bg-white/4" />
        <div className="flex gap-1.5">
          <div className="size-7 rounded-lg bg-white/4" />
          <div className="size-7 rounded-lg bg-white/4" />
          <div className="size-7 rounded-lg bg-white/4" />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <IntentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading profile">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8">
        <div className="size-20 rounded-full bg-white/6 shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <div className="h-6 w-48 rounded bg-white/6" />
          <div className="h-4 w-28 rounded bg-white/4" />
          <div className="h-4 w-full max-w-md rounded bg-white/4" />
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-white/4" />
            <div className="h-5 w-24 rounded-full bg-white/4" />
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6 border-b border-white/6 pb-2">
        <div className="h-5 w-28 rounded bg-white/6" />
        <div className="h-5 w-24 rounded bg-white/4" />
        <div className="h-5 w-20 rounded bg-white/4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <IntentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-card p-4 animate-pulse" role="status" aria-label="Loading notification">
      <div className="size-9 rounded-full bg-white/6 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-white/6" />
        <div className="h-3 w-20 rounded bg-white/4" />
      </div>
    </div>
  );
}

export function NotificationListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}
