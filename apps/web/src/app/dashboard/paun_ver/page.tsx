import { redirect } from "next/navigation";

export default function LegacyRatingsRedirectPage() {
  redirect("/dashboard/puanlarim");
}
