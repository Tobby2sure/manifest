"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/lib/hooks/use-user";
import { getOrg } from "../actions";
import {
  searchUsersByHandle,
  sendAffiliateRequest,
  getOrgAffiliateRequests,
  cancelAffiliateRequest,
  removeAffiliate,
} from "@/app/actions/affiliates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/page-loader";
import {
  ArrowLeft,
  Search,
  Send,
  X,
  CheckCircle,
  Clock,
  XCircle,
  UserMinus,
  Shield,
  Users,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  members: Array<{
    id: string;
    profile_id: string;
    role: string;
    profiles: {
      id: string;
      display_name: string | null;
      twitter_handle: string | null;
      twitter_verified: boolean;
      avatar_url: string | null;
    };
  }>;
}

interface AffiliateRequestRow {
  id: string;
  status: string;
  created_at: string;
  target: {
    id: string;
    display_name: string | null;
    twitter_handle: string | null;
    avatar_url: string | null;
  };
}

interface SearchResult {
  id: string;
  display_name: string | null;
  twitter_handle: string | null;
  avatar_url: string | null;
  twitter_verified: boolean;
}

export default function OrgDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { profile, isLoading } = useUser();

  const [org, setOrg] = useState<OrgData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState<AffiliateRequestRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;

    getOrg(slug).then((data) => {
      if (!data) {
        setLoading(false);
        return;
      }
      setOrg(data as OrgData);
      const admin = data.members.some(
        (m: { profile_id: string; role: string }) =>
          m.profile_id === profile.id && m.role === "admin"
      );
      setIsAdmin(admin);

      if (admin) {
        getOrgAffiliateRequests(data.id)
          .then((rows) => setRequests(rows as AffiliateRequestRow[]))
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [slug, profile]);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsersByHandle(value);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleSendRequest(targetId: string) {
    if (!org) return;
    setSendingTo(targetId);
    try {
      await sendAffiliateRequest({ orgId: org.id, targetProfileId: targetId });
      toast.success("Affiliate request sent");
      // Refresh requests list
      const rows = await getOrgAffiliateRequests(org.id);
      setRequests(rows as AffiliateRequestRow[]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setSendingTo(null);
    }
  }

  async function handleCancelRequest(requestId: string) {
    try {
      await cancelAffiliateRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    }
  }

  async function handleRemoveAffiliate(profileId: string) {
    if (!org) return;
    if (!confirm("Remove this affiliate? They'll lose the org badge.")) return;
    try {
      await removeAffiliate({ orgId: org.id, profileId });
      setOrg((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m.profile_id !== profileId) }
          : prev
      );
      toast.success("Affiliate removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  if (isLoading || loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <PageLoader />
      </main>
    );
  }

  if (!org) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white/90">Organization not found</h1>
          <Button variant="outline" onClick={() => router.push("/feed")} className="mt-4 border-white/10">
            Back to Feed
          </Button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="size-10 text-zinc-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white/90 mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-400 mb-5">
            Only org admins can access the dashboard.
          </p>
          <Link href={`/org/${slug}`}>
            <Button variant="outline" className="border-white/10">
              <ArrowLeft className="size-4 mr-1.5" />
              Back to Org
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const admins = org.members.filter((m) => m.role === "admin");
  const regularMembers = org.members.filter((m) => m.role === "member");
  const affiliates = org.members.filter((m) => m.role === "affiliate");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/org/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="size-3.5" />
              Back to {org.name}
            </Link>
            <h1 className="text-2xl font-bold text-white/90">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage members and grant affiliate badges
            </p>
          </div>
          <Link href={`/org/${slug}/approvals`}>
            <Button variant="outline" size="sm" className="border-white/10">
              Intent Approvals
            </Button>
          </Link>
        </div>

        {/* Send affiliate request */}
        <section className="rounded-xl border border-white/8 bg-card p-6">
          <h2 className="text-base font-semibold text-white/90 mb-1 flex items-center gap-2">
            <Award className="size-4 text-violet-400" />
            Send Affiliate Request
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            Search for a user by display name or X handle. They'll receive a notification to accept or decline.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search users..."
              className="pl-9 bg-white/5 border-white/8"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {searching && (
            <p className="text-xs text-zinc-500 mt-3">Searching...</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((user) => {
                const isExistingMember = org.members.some((m) => m.profile_id === user.id);
                const isPending = pendingRequests.some((r) => r.target.id === user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 p-3"
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                        {(user.display_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white/90 truncate">
                          {user.display_name ?? "Anonymous"}
                        </span>
                        {user.twitter_verified && (
                          <CheckCircle className="size-3 text-sky-400" />
                        )}
                      </div>
                      {user.twitter_handle && (
                        <p className="text-xs text-zinc-500">@{user.twitter_handle}</p>
                      )}
                    </div>
                    {isExistingMember ? (
                      <span className="text-xs text-zinc-500">Member</span>
                    ) : isPending ? (
                      <span className="text-xs text-amber-400">Pending</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(user.id)}
                        disabled={sendingTo === user.id}
                        className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                      >
                        <Send className="size-3.5 mr-1" />
                        {sendingTo === user.id ? "Sending..." : "Send"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-xs text-zinc-500 mt-3">No users found.</p>
          )}
        </section>

        {/* Members sections */}
        <section className="rounded-xl border border-white/8 bg-card p-6">
          <h2 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <Users className="size-4 text-violet-400" />
            Members ({org.members.length})
          </h2>

          {admins.length > 0 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Admins</p>
              <div className="space-y-2">
                {admins.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {regularMembers.length > 0 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Members</p>
              <div className="space-y-2">
                {regularMembers.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {affiliates.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Affiliates</p>
              <div className="space-y-2">
                {affiliates.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    onRemove={() => handleRemoveAffiliate(m.profile_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {affiliates.length === 0 && (
            <p className="text-xs text-zinc-500">
              No affiliates yet. Send affiliate requests above to grant badges.
            </p>
          )}
        </section>

        {/* Pending + recent requests */}
        {requests.length > 0 && (
          <section className="rounded-xl border border-white/8 bg-card p-6">
            <h2 className="text-base font-semibold text-white/90 mb-4">Affiliate Requests</h2>
            <div className="space-y-2">
              {requests.slice(0, 20).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/3 p-3"
                >
                  {req.target.avatar_url ? (
                    <Image
                      src={req.target.avatar_url}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                      {(req.target.display_name ?? "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 truncate">
                      {req.target.display_name ?? "Anonymous"}
                    </p>
                    {req.target.twitter_handle && (
                      <p className="text-xs text-zinc-500">@{req.target.twitter_handle}</p>
                    )}
                  </div>
                  <StatusBadge status={req.status} />
                  {req.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelRequest(req.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function MemberRow({
  member,
  onRemove,
}: {
  member: OrgData["members"][number];
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {member.profiles.avatar_url ? (
        <Image
          src={member.profiles.avatar_url}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
          {(member.profiles.display_name ?? "?")[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white/90 truncate">
            {member.profiles.display_name ?? "Anonymous"}
          </span>
          {member.profiles.twitter_verified && (
            <CheckCircle className="size-3 text-sky-400" />
          )}
        </div>
        {member.profiles.twitter_handle && (
          <p className="text-xs text-zinc-500">@{member.profiles.twitter_handle}</p>
        )}
      </div>
      {onRemove && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <UserMinus className="size-3.5 mr-1" />
          Remove
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-xs">
        <Clock className="size-3" />
        Pending
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs">
        <CheckCircle className="size-3" />
        Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 text-xs">
      <XCircle className="size-3" />
      Declined
    </span>
  );
}
