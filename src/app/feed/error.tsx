'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-400">Something went wrong loading this page.</p>
      <button onClick={reset} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-300 transition-colors">
        Try again
      </button>
    </div>
  );
}
