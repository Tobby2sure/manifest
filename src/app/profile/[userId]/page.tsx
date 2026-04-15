import type { Metadata } from "next";
import { getProfile } from "@/app/actions/profiles";
import { getIntentsByAuthor } from "@/app/actions/intents";
import { getUserOrgs } from "@/app/actions/org-intents";
import { ProfileClient } from "./profile-client";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getProfile(userId);
  return {
    title: profile?.display_name ?? 'Profile',
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getProfile(userId);

  if (!profile) {
    notFound();
  }

  const [intents, orgMemberships] = await Promise.all([
    getIntentsByAuthor(userId),
    getUserOrgs(userId).catch(() => []),
  ]);

  const profileWithOrgs = { ...profile, org_memberships: orgMemberships };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ProfileClient profile={profileWithOrgs} intents={intents} />
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
