import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import SignInForm from "@/components/SignInForm";
import CreateLeagueForm from "@/components/CreateLeagueForm";

export const metadata: Metadata = {
  title: "Create a Private League",
  description: "Create a private World Cup Pick'em league for friends, coworkers or your watch party.",
};

export default async function CreateLeaguePage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Create a Private League</h1>
        <p className="mb-6 text-sm text-[#aaa]">Sign in to create your league.</p>
        <SignInForm />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-white">Create a Private League</h1>
      <p className="mb-6 text-sm text-[#aaa]">
        Name your league and invite your group. You pay once as the host — everyone you invite joins
        free.
      </p>
      <CreateLeagueForm />
    </div>
  );
}
