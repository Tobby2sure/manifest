import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Users, FileText } from "lucide-react";

interface OrgCardProps {
  slug: string;
  name: string;
  logo_url: string | null;
  twitter_verified: boolean;
  memberCount: number;
  intentCount: number;
}

export function OrgCard({
  slug,
  name,
  logo_url,
  twitter_verified,
  memberCount,
  intentCount,
}: OrgCardProps) {
  return (
    <Link
      href={`/org/${slug}`}
      className="block rounded-xl border border-white/8 bg-card p-4 hover:border-white/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        {logo_url ? (
          <Image
            src={logo_url}
            alt={name}
            width={40}
            height={40}
            className="size-10 rounded-lg object-cover"
          />
        ) : (
          <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-white/60">
            {name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white/90 truncate">
              {name}
            </span>
            {twitter_verified && (
              <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Users className="size-3" />
              {memberCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <FileText className="size-3" />
              {intentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
