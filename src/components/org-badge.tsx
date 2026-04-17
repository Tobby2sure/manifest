import Link from "next/link";

interface OrgBadgeProps {
  orgName: string;
  orgSlug: string;
  size?: "sm" | "md";
  isAffiliate?: boolean;
}

export function OrgBadge({ orgName, orgSlug, size = "sm", isAffiliate = false }: OrgBadgeProps) {
  const baseClasses = `inline-flex items-center gap-1 rounded-full border transition-colors duration-200 ${
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
  }`;

  const colorClasses = isAffiliate
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
    : "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20";

  return (
    <Link href={`/org/${orgSlug}`} className={`${baseClasses} ${colorClasses}`}>
      {isAffiliate ? "★" : "🏢"} {orgName}
      {isAffiliate && <span className="opacity-70">· Affiliate</span>}
    </Link>
  );
}
