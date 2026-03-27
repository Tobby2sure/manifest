import { getProfile } from "@/app/actions/profiles";
import { getIntentsByAuthor } from "@/app/actions/intents";
import { ProfileClient } from "./profile-client";
import { notFound } from "next/navigation";

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

  const intents = await getIntentsByAuthor(userId);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#080810]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ProfileClient profile={profile} intents={intents} />
      </div>
    </main>
  );
}
