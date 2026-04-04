import Link from "next/link";

interface OrgBadgeProps {
  orgName: string;
  orgSlug: string;
  size?: "sm" | "md";
}

export function OrgBadge({ orgName, orgSlug, size = "sm" }: OrgBadgeProps) {
  return (
    <Link
      href={`/org/${orgSlug}`}
      className={`inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors duration-200 ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      🏢 {orgName}
    </Link>
  );
}
