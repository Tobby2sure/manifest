export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-zinc-400 mb-6">This page doesn&apos;t exist.</p>
        <a href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Manifest
        </a>
      </div>
    </div>
  );
}
