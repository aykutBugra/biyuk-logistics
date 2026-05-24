import { redirect } from "next/navigation";

// Eski teklif verme route'u artik acik istekler listesine yonleniyor.
export default function OfferRedirectPage() {
  redirect("/dashboard/acik_istekler");
}
