"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getTransportRequestDetail,
  type TransportRequestDetail,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TransportRequestDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);
  const [request, setRequest] = useState<TransportRequestDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(requestId) || requestId <= 0) {
      setErrorMessage("Gecersiz istek numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRequest = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getTransportRequestDetail(requestId, accessToken);

        if (!isMounted) {
          return;
        }

        setRequest(response);
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

        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage("Bu istek bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Istek detayi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequest();

    return () => {
      isMounted = false;
    };
  }, [accessToken, requestId, router, status]);

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CustomerTransportRequestsShell
      title="Istek detayi"
      description="Ownership kurali nedeniyle yalnizca kendi kaydini gorebilirsin."
    >
        {isLoading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
            Istek detayi yukleniyor...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Kayit goruntulenemedi</h2>
            <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && request ? (
          <div className="grid gap-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      {request.durum}
                    </span>
                    <span>#{request.id}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {request.baslangicSehri} {"->"} {request.varisSehri}
                  </h2>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(request.olusturmaTarihi)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Yuk detayi</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                {request.yukDetay}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Baslangic</h3>
                <dl className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Sehir</dt>
                    <dd>{request.baslangicSehri}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Enlem</dt>
                    <dd>{request.baslangicEnlem}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Boylam</dt>
                    <dd>{request.baslangicBoylam}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Varis</h3>
                <dl className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Sehir</dt>
                    <dd>{request.varisSehri}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Enlem</dt>
                    <dd>{request.varisEnlem}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Boylam</dt>
                    <dd>{request.varisBoylam}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        ) : null}
    </CustomerTransportRequestsShell>
  );
}
