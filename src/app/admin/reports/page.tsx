"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/page-loader";
import {
  listReports,
  updateReportStatus,
  type ReportWithContext,
} from "@/app/actions/admin-moderation";
import {
  AlertTriangle,
  Check,
  X,
  Shield,
  Clock,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type TabKey = "open" | "resolved" | "dismissed";

export default function AdminReportsPage() {
  const { isAuthenticated, isLoading } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("open");
  const [reports, setReports] = useState<ReportWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    loadReports(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, tab]);

  function loadReports(status: TabKey) {
    setLoading(true);
    listReports(status)
      .then((data) => {
        setReports(data);
        setDenied(false);
      })
      .catch((e) => {
        if (e instanceof Error && e.message.toLowerCase().includes("admin")) {
          setDenied(true);
        }
      })
      .finally(() => setLoading(false));
  }

  function handleUpdate(reportId: string, status: "resolved" | "dismissed") {
    startTransition(async () => {
      try {
        await updateReportStatus(reportId, status);
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        toast.success(`Report ${status}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  if (isLoading || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <PageLoader />
      </main>
    );
  }

  if (denied) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="size-10 text-zinc-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white/90 mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-400 mb-5">
            Admin access required. Add your user ID to <code className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">MANIFEST_ADMIN_IDS</code>.
          </p>
          <Link href="/feed">
            <Button variant="outline" className="border-white/10">Back to Feed</Button>
          </Link>
        </div>
      </main>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof Check }[] = [
    { key: "open", label: "Open", icon: Inbox },
    { key: "resolved", label: "Resolved", icon: Check },
    { key: "dismissed", label: "Dismissed", icon: X },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
            <Shield className="size-5 text-violet-400" />
            Moderation
          </h1>
          <p className="text-sm text-zinc-400 mt-1">User-submitted reports.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                tab === t.key
                  ? "text-white border-violet-500"
                  : "text-zinc-500 hover:text-zinc-300 border-transparent"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="size-8 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">No {tab} reports.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/8 bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
                      {r.reason}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {tab === "open" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleUpdate(r.id, "dismissed")}
                        className="border-white/10 text-zinc-300"
                      >
                        <X className="size-3.5 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleUpdate(r.id, "resolved")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Check className="size-3.5 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Reporter</p>
                    {r.reporter ? (
                      <Link
                        href={`/profile/${r.reporter.id}`}
                        className="text-zinc-200 hover:text-white"
                      >
                        {r.reporter.display_name ?? "Anonymous"}
                        {r.reporter.twitter_handle && (
                          <span className="text-zinc-500"> · @{r.reporter.twitter_handle}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Reported</p>
                    {r.reported_user ? (
                      <Link
                        href={`/profile/${r.reported_user.id}`}
                        className="text-zinc-200 hover:text-white"
                      >
                        {r.reported_user.display_name ?? "Anonymous"}
                        {r.reported_user.twitter_handle && (
                          <span className="text-zinc-500"> · @{r.reported_user.twitter_handle}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                </div>

                {r.reported_intent && (
                  <div className="rounded-lg border border-white/6 bg-white/3 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                      Reported intent · {r.reported_intent.type}
                    </p>
                    <p className="text-sm text-zinc-300 line-clamp-3">{r.reported_intent.content}</p>
                    <Link
                      href={`/feed?intent=${r.reported_intent.id}`}
                      className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block"
                    >
                      View in feed →
                    </Link>
                  </div>
                )}

                {r.details && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Details</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.details}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
