import { redirect } from "next/navigation";

// Eski yazimla kalmis puan verme route'u dogru puanlarim ekranina tasir.
export default function LegacyRatingsRedirectPage() {
  redirect("/dashboard/puanlarim");
}
