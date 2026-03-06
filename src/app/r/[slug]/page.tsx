import { redirect } from "next/navigation";
import { findUserByPartnerShortSlug } from "@/lib/user-referral-raw";

type Props = { params: Promise<{ slug: string }> };

export default async function ShortReferralPage({ params }: Props) {
  const { slug } = await params;
  const user = await findUserByPartnerShortSlug(slug);
  if (!user) {
    redirect("/");
  }
  redirect(`/?ref=${encodeURIComponent(user.referralCode)}`);
}
