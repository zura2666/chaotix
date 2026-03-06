import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { EmptyState } from "@/components/EmptyState";
import { ProfileStats } from "./ProfileStats";
import { ProfileReferralSection } from "@/components/referral/ProfileReferralSection";
import { ReferralProfile } from "./ReferralProfile";

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/");

  return (
    <div className="mx-auto max-w-4xl space-y-12 md:space-y-16">
      {/* User header: avatar rounded-full bg-slate-800 text-2xl, username text-slate-100, email text-slate-500 */}
      <section>
        <ChaotixCard as="div" className="p-6 md:p-10">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:text-left">
            {user.oauthPicture ? (
              <img
                src={user.oauthPicture}
                alt="Profile"
                width={80}
                height={80}
                className="h-20 w-20 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-2xl font-semibold text-slate-100">
                {(user.name ?? user.username ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-tighter text-slate-100">
                {user.name ?? user.username ?? "—"}
              </p>
              {user.username && (
                <p className="text-sm text-slate-500">@{user.username}</p>
              )}
              {user.email && (
                <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
              )}
              {user.oauthProvider && (
                <p className="mt-1 text-xs text-slate-500">
                  Signed up with{" "}
                  {user.oauthProvider === "google"
                    ? "Google"
                    : user.oauthProvider === "facebook"
                      ? "Facebook"
                      : user.oauthProvider}
                </p>
              )}
            </div>
          </div>
        </ChaotixCard>
      </section>

      {/* Stats: ChaotixCard grid — balance, referral count, volume */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
          Overview
        </h2>
        <ProfileStats balance={user.balance} />
      </section>

      {/* Create Market CTA: prominent ChaotixCard with primary button */}
      <section>
        <ChaotixCard as="div" className="border-emerald-500/20 bg-emerald-500/5 p-6 md:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tighter text-slate-100">
                Create New Market
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Launch a canonical prediction market. Set initial liquidity and start trading.
              </p>
            </div>
            <ChaotixButton
              href="/create"
              variant="primary"
              className="min-h-[44px] w-full shrink-0 sm:w-auto"
            >
              <PlusCircle className="mr-2 h-5 w-5" aria-hidden />
              Create New Market
            </ChaotixButton>
          </div>
        </ChaotixCard>
      </section>

      {/* Your markets: empty state when none created (list can be wired later) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
          Your markets
        </h2>
        <EmptyState
          title="No markets created"
          description="Create your first prediction market and start trading."
          ctaLabel="Create Market"
          ctaHref="/create"
        />
      </section>

      {/* Referral section with status badges (inside ProfileReferralSection) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tighter text-slate-100">
          Referral program
        </h2>
        <ProfileReferralSection
          referralStatus={user.referralStatus ?? "NONE"}
          referralCode={user.referralCode}
          partnerShortSlug={user.partnerShortSlug ?? null}
        />
      </section>

      {user.referralStatus === "APPROVED" && (
        <section>
          <ReferralProfile referralCode={user.referralCode} />
        </section>
      )}
    </div>
  );
}
