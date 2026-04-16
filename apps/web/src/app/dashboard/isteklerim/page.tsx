"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyTransportRequests,
  type TransportRequestListItem,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MyTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [requests, setRequests] = useState<TransportRequestListItem[]>([]);
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
        const response = await getMyTransportRequests(accessToken);

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
            : "Istekler yuklenirken beklenmeyen bir hata olustu."
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
    <CustomerTransportRequestsShell
      title="Isteklerim"
      description="Yalnizca giris yapan musteriye ait transport request kayitlari listelenir."
    >
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
            Istekler yukleniyor...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && !errorMessage && requests.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Henuz istek yok</h2>
            <p className="mt-2 text-sm text-gray-600">
              Ilk transport request kaydini olusturunca burada goreceksin.
            </p>
            <Link
              href="/dashboard/istek_ekle"
              className="mt-4 inline-flex items-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Ilk istegi olustur
            </Link>
          </div>
        ) : null}

        {!isLoading && !errorMessage && requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/dashboard/isteklerim/${request.id}`}
                className="block rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-transform hover:-translate-y-0.5 hover:border-blue-200"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                        {request.durum}
                      </span>
                      <span>#{request.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {request.baslangicSehri} {"->"} {request.varisSehri}
                    </h2>
                    <p className="text-sm text-gray-600">{request.yukDetay}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(request.olusturmaTarihi)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
    </CustomerTransportRequestsShell>
  );
}
