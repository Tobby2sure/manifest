"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { getOrg } from "../actions";
import {
  getPendingOrgApprovals,
  approveOrgIntent,
  rejectOrgIntent,
} from "@/app/actions/org-intents";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Inbox } from "lucide-react";
import Link from "next/link";

interface PendingRequest {
  id: string;
  intent_id: string;
  org_id: string;
  submitted_by: string;
  created_at: string;
  intent: {
    id: string;
    content: string;
    type: string;
    ecosystem: string | null;
    sector: string | null;
    author: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  submitter: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function ApprovalsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { profile } = useUser();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    getOrg(slug).then((org) => {
      if (!org) {
        setLoading(false);
        return;
      }
      setOrgId(org.id);
      const admin = org.members.some(
        (m: { profile_id: string; role: string }) =>
          m.profile_id === profile.id && m.role === "admin"
      );
      setIsAdmin(admin);

      if (admin) {
        getPendingOrgApprovals(org.id)
          .then((data) => setPending(data as unknown as PendingRequest[]))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [slug, profile]);

  async function handleApprove(requestId: string) {
    if (!profile) return;
    setProcessing(requestId);
    try {
      await approveOrgIntent(requestId, profile.id);
      setPending((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // ignore
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(requestId: string) {
    if (!profile) return;
    setProcessing(requestId);
    try {
      await rejectOrgIntent(requestId, profile.id, rejectReason);
      setPending((prev) => prev.filter((r) => r.id !== requestId));
      setRejectingId(null);
      setRejectReason("");
    } catch {
      // ignore
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white/90">Access Denied</h1>
          <p className="text-zinc-400 mt-2">
            Only org admins can view this page.
          </p>
          <Link href={`/org/${slug}`}>
            <Button variant="outline" className="mt-4 border-white/10">
              Back to Org
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white/90">
            Pending Approvals
          </h1>
          <Link href={`/org/${slug}`}>
            <Button variant="outline" size="sm" className="border-white/10">
              Back to Org
            </Button>
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-card p-12 text-center">
            <Inbox className="size-8 mx-auto mb-3 text-zinc-500" />
            <p className="text-zinc-400">No pending approvals</p>
            <p className="text-xs text-zinc-500 mt-1">
              When members submit intents on behalf of the org, they&apos;ll
              appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-white/[0.08] bg-card p-5"
              >
                {/* Submitter info */}
                <div className="flex items-center gap-2 mb-3">
                  {request.submitter?.avatar_url ? (
                    <img
                      src={request.submitter.avatar_url}
                      alt=""
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                      {(request.submitter?.display_name ?? "?")[0]}
                    </div>
                  )}
                  <span className="text-sm text-zinc-300">
                    {request.submitter?.display_name ?? "Unknown"}{" "}
                    <span className="text-zinc-500">submitted</span>
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Intent preview */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                  <span className="inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-xs text-violet-400 font-medium mb-2">
                    {request.intent?.type}
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {request.intent?.content}
                  </p>
                </div>

                {/* Actions */}
                {rejectingId === request.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)..."
                      className="min-h-16 bg-white/5 border-white/10 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        disabled={processing === request.id}
                        className="bg-red-600 hover:bg-red-500 text-white border-0"
                      >
                        {processing === request.id
                          ? "Rejecting..."
                          : "Confirm Reject"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                    >
                      <CheckCircle className="size-3.5 mr-1" />
                      {processing === request.id ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingId(request.id)}
                      className="border-white/10 text-red-400 hover:text-red-300"
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Reject
                    </Button>
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

export const dynamic = "force-dynamic";
