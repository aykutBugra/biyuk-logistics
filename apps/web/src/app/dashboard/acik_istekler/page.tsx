"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getOpenOfferRequests,
  type OpenOfferRequestListItem,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OpenTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [requests, setRequests] = useState<OpenOfferRequestListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOpenOfferRequests(accessToken);

        if (!isMounted) {
          return;
        }

        setRequests(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Acik istekler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Acik istekler"
      description="Teklif verebilecegin aktif tasima taleplerini burada gorebilirsin."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Acik istekler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Uygun istek bulunmuyor</h2>
          <p className="mt-2 text-sm text-gray-600">
            Su anda teklif vermeye acik bir tasima talebi yok.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      {request.durum}
                    </span>
                    <span>#{request.id}</span>
                    {request.alreadyOffered ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        Teklif verdin
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {request.baslangicSehri} {"->"} {request.varisSehri}
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-3">{request.yukDetay}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {formatDate(request.olusturmaTarihi)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/acik_istekler/${request.id}`}
                    className="inline-flex items-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Detay ve Teklif
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
