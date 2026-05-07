/// <reference types="google.maps" />

"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CarrierRouteDetail } from "@/lib/api/carrier-routes";
import type { OpenOfferRequestListItem } from "@/lib/api/offers";

type OpenRequestsMapPanelProps = {
  requests: OpenOfferRequestListItem[];
  selectedCarrierRoute: CarrierRouteDetail | null;
  selectedRequestId: number | null;
  onRequestSelect: (requestId: number) => void;
  hideHeader?: boolean;
  isVisible?: boolean;
};

const GOOGLE_MAPS_BROWSER_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY?.trim() ?? "";

const DEFAULT_CENTER = {
  lat: 39.0,
  lng: 35.0,
};

const MAP_DEFAULT_ZOOM = 6;
const IS_GOOGLE_MAPS_BROWSER_KEY_MISSING = !GOOGLE_MAPS_BROWSER_API_KEY;

let googleMapsLoaderPromise: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (!GOOGLE_MAPS_BROWSER_API_KEY) {
    return Promise.reject(
      new Error("Maps JavaScript API key is not configured.")
    );
  }

  if (!googleMapsLoaderPromise) {
    setOptions({
      key: GOOGLE_MAPS_BROWSER_API_KEY,
      v: "weekly",
      language: "tr",
      region: "TR",
    });

    googleMapsLoaderPromise = importLibrary("maps").then(() => google);
  }

  return googleMapsLoaderPromise;
}

function hasValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function createMarkerIcon(
  googleMaps: typeof google,
  options: {
    fillColor: string;
    strokeColor: string;
    scale: number;
  }
): google.maps.Symbol {
  return {
    path: googleMaps.maps.SymbolPath.CIRCLE,
    fillColor: options.fillColor,
    fillOpacity: 1,
    strokeColor: options.strokeColor,
    strokeOpacity: 1,
    strokeWeight: 2,
    scale: options.scale,
  };
}

function fitMapToPoints(
  map: google.maps.Map,
  googleMaps: typeof google,
  points: Array<{ lat: number; lng: number }>
) {
  if (points.length === 0) {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(MAP_DEFAULT_ZOOM);
    return;
  }

  if (points.length === 1) {
    map.setCenter(points[0]);
    map.setZoom(10);
    return;
  }

  const bounds = new googleMaps.maps.LatLngBounds();
  points.forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, 56);
}

export default function OpenRequestsMapPanel({
  requests,
  selectedCarrierRoute,
  selectedRequestId,
  onRequestSelect,
  hideHeader = false,
  isVisible = true,
}: OpenRequestsMapPanelProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const activeVisiblePointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    let isMounted = true;

    if (IS_GOOGLE_MAPS_BROWSER_KEY_MISSING) {
      return;
    }

    const initializeMap = async () => {
      try {
        const googleMaps = await loadGoogleMaps();

        if (!isMounted || !mapElementRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new googleMaps.maps.Map(mapElementRef.current, {
            center: DEFAULT_CENTER,
            zoom: MAP_DEFAULT_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }

        setIsMapReady(true);
        setLoadErrorMessage(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setLoadErrorMessage(
          "Harita şu anda yüklenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void initializeMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    let isCancelled = false;

    const renderMapState = async () => {
      try {
        const googleMaps = await loadGoogleMaps();

        if (isCancelled || !mapRef.current) {
          return;
        }

        const map = mapRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        polylinesRef.current.forEach((polyline) => polyline.setMap(null));
        markersRef.current = [];
        polylinesRef.current = [];

        const allVisiblePoints: Array<{ lat: number; lng: number }> = [];

        if (
          selectedCarrierRoute &&
          hasValidCoordinate(
            selectedCarrierRoute.baslangicEnlem,
            selectedCarrierRoute.baslangicBoylam
          ) &&
          hasValidCoordinate(
            selectedCarrierRoute.varisEnlem,
            selectedCarrierRoute.varisBoylam
          )
        ) {
          const routeStart = {
            lat: selectedCarrierRoute.baslangicEnlem,
            lng: selectedCarrierRoute.baslangicBoylam,
          };
          const routeEnd = {
            lat: selectedCarrierRoute.varisEnlem,
            lng: selectedCarrierRoute.varisBoylam,
          };

          const routeStartMarker = new googleMaps.maps.Marker({
            map,
            position: routeStart,
            title: "Rota baslangici",
            label: {
              text: "B",
              color: "#ffffff",
              fontWeight: "700",
            },
            icon: createMarkerIcon(googleMaps, {
              fillColor: "#2563eb",
              strokeColor: "#1d4ed8",
              scale: 8,
            }),
          });

          const routeEndMarker = new googleMaps.maps.Marker({
            map,
            position: routeEnd,
            title: "Rota varisi",
            label: {
              text: "V",
              color: "#ffffff",
              fontWeight: "700",
            },
            icon: createMarkerIcon(googleMaps, {
              fillColor: "#1d4ed8",
              strokeColor: "#172554",
              scale: 8,
            }),
          });

          const routePolyline = new googleMaps.maps.Polyline({
            map,
            path: [routeStart, routeEnd],
            geodesic: true,
            strokeColor: "#2563eb",
            strokeOpacity: 0.9,
            strokeWeight: 3,
          });

          markersRef.current.push(routeStartMarker, routeEndMarker);
          polylinesRef.current.push(routePolyline);
          allVisiblePoints.push(routeStart, routeEnd);
        }

        requests.forEach((request) => {
          if (
            !hasValidCoordinate(request.baslangicEnlem, request.baslangicBoylam) ||
            !hasValidCoordinate(request.varisEnlem, request.varisBoylam)
          ) {
            return;
          }

          const isSelected = request.id === selectedRequestId;
          const pickup = {
            lat: request.baslangicEnlem,
            lng: request.baslangicBoylam,
          };
          const dropoff = {
            lat: request.varisEnlem,
            lng: request.varisBoylam,
          };

          const pickupMarker = new googleMaps.maps.Marker({
            map,
            position: pickup,
            title: `${request.id} pickup`,
            label: {
              text: "A",
              color: "#ffffff",
              fontWeight: "700",
            },
            zIndex: isSelected ? 30 : 20,
            icon: createMarkerIcon(googleMaps, {
              fillColor: isSelected ? "#16a34a" : "#22c55e",
              strokeColor: isSelected ? "#14532d" : "#15803d",
              scale: isSelected ? 8 : 6,
            }),
          });

          const dropoffMarker = new googleMaps.maps.Marker({
            map,
            position: dropoff,
            title: `${request.id} dropoff`,
            label: {
              text: "T",
              color: "#ffffff",
              fontWeight: "700",
            },
            zIndex: isSelected ? 30 : 20,
            icon: createMarkerIcon(googleMaps, {
              fillColor: isSelected ? "#f97316" : "#fb923c",
              strokeColor: isSelected ? "#9a3412" : "#c2410c",
              scale: isSelected ? 8 : 6,
            }),
          });

          pickupMarker.addListener("click", () => onRequestSelect(request.id));
          dropoffMarker.addListener("click", () => onRequestSelect(request.id));

          markersRef.current.push(pickupMarker, dropoffMarker);
          allVisiblePoints.push(pickup, dropoff);
        });

        if (
          selectedRequest &&
          hasValidCoordinate(
            selectedRequest.baslangicEnlem,
            selectedRequest.baslangicBoylam
          ) &&
          hasValidCoordinate(
            selectedRequest.varisEnlem,
            selectedRequest.varisBoylam
          )
        ) {
          const selectedPath = [
            {
              lat: selectedRequest.baslangicEnlem,
              lng: selectedRequest.baslangicBoylam,
            },
            {
              lat: selectedRequest.varisEnlem,
              lng: selectedRequest.varisBoylam,
            },
          ];

          const selectedPolyline = new googleMaps.maps.Polyline({
            map,
            path: selectedPath,
            geodesic: true,
            strokeColor: "#0f172a",
            strokeOpacity: 0.9,
            strokeWeight: 2,
          });

          polylinesRef.current.push(selectedPolyline);
          activeVisiblePointsRef.current = selectedPath;

          if (isVisible) {
            fitMapToPoints(map, googleMaps, selectedPath);
          }

          return;
        }

        activeVisiblePointsRef.current = allVisiblePoints;

        if (isVisible) {
          fitMapToPoints(map, googleMaps, allVisiblePoints);
        }
      } catch {
        if (isCancelled) {
          return;
        }

        setLoadErrorMessage(
          "Harita şu anda yüklenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void renderMapState();

    return () => {
      isCancelled = true;
    };
  }, [
    isMapReady,
    isVisible,
    onRequestSelect,
    requests,
    selectedCarrierRoute,
    selectedRequest,
    selectedRequestId,
  ]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !isVisible) {
      return;
    }

    let isCancelled = false;

    const syncVisibleMapState = async () => {
      try {
        const googleMaps = await loadGoogleMaps();

        if (isCancelled || !mapRef.current) {
          return;
        }

        requestAnimationFrame(() => {
          if (isCancelled || !mapRef.current) {
            return;
          }

          googleMaps.maps.event.trigger(mapRef.current, "resize");
          fitMapToPoints(
            mapRef.current,
            googleMaps,
            activeVisiblePointsRef.current
          );
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setLoadErrorMessage(
          "Harita ÅŸu anda yÃ¼klenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void syncVisibleMapState();

    return () => {
      isCancelled = true;
    };
  }, [isMapReady, isVisible, requests, selectedCarrierRoute, selectedRequestId]);

  const hasRenderableContent =
    requests.length > 0 ||
    (selectedCarrierRoute &&
      hasValidCoordinate(
        selectedCarrierRoute.baslangicEnlem,
        selectedCarrierRoute.baslangicBoylam
      ) &&
      hasValidCoordinate(
        selectedCarrierRoute.varisEnlem,
        selectedCarrierRoute.varisBoylam
      ));
  const mapFallbackMessage = IS_GOOGLE_MAPS_BROWSER_KEY_MISSING
    ? "Harita anahtarı tanımlı değil. Listeyi kullanmaya devam edebilirsin."
    : loadErrorMessage;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {!hideHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-black tracking-tight text-slate-950">
              Harita görünümü
            </h2>
            <p className="text-xs text-slate-500">
              Alış ve teslim noktaları listelenen isteklere göre güncellenir.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold text-slate-700">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
              Alış
            </span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700 ring-1 ring-orange-100">
              Teslim
            </span>
            {selectedCarrierRoute ? (
              <>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 ring-1 ring-blue-100">
                  Rota başlangıcı
                </span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-100">
                  Rota varışı
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {mapFallbackMessage ? (
        <div
          className={`${hideHeader ? "" : "mt-3 "}rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800`}
        >
          {mapFallbackMessage}
        </div>
      ) : null}

      {!mapFallbackMessage && !hasRenderableContent ? (
        <div
          className={`${hideHeader ? "" : "mt-3 "}rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500`}
        >
          Haritada gösterilecek açık istek yok.
        </div>
      ) : null}

      {!mapFallbackMessage && hasRenderableContent ? (
        <div
          ref={mapElementRef}
          className={`${hideHeader ? "" : "mt-3 "}h-[340px] rounded-xl border border-slate-200 bg-slate-100 md:h-[420px] xl:h-[520px]`}
        />
      ) : null}
    </div>
  );
}
