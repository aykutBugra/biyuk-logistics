/// <reference types="google.maps" />

"use client";

import {
  importLibrary,
  setOptions,
  type APIOptions,
} from "@googlemaps/js-api-loader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CarrierRouteDetail } from "@/lib/api/carrier-routes";
import type { OpenOfferRequestListItem } from "@/lib/api/offers";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
} from "@/lib/logistics";

type OpenRequestsMapPanelProps = {
  requests: OpenOfferRequestListItem[];
  selectedCarrierRoute: CarrierRouteDetail | null;
  maxSapmaKm?: number | null;
  selectedRequestId: string | null;
  onRequestSelect: (requestId: string) => void;
  hideHeader?: boolean;
  isVisible?: boolean;
  resizeSignal?: number;
};

type MapPoint = {
  lat: number;
  lng: number;
};

type LoadedGoogleMaps = {
  googleMaps: typeof google;
  markerLibrary: google.maps.MarkerLibrary;
};

const GOOGLE_MAPS_BROWSER_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY?.trim() ?? "";
const GOOGLE_MAPS_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ?? "";

const DEFAULT_CENTER = {
  lat: 39.0,
  lng: 35.0,
};

const MAP_DEFAULT_ZOOM = 6;
const IS_GOOGLE_MAPS_BROWSER_KEY_MISSING = !GOOGLE_MAPS_BROWSER_API_KEY;

let googleMapsLoaderPromise: Promise<LoadedGoogleMaps> | null = null;

function loadGoogleMaps(): Promise<LoadedGoogleMaps> {
  if (!GOOGLE_MAPS_BROWSER_API_KEY) {
    return Promise.reject(new Error("Maps JavaScript API key is not configured."));
  }

  if (!googleMapsLoaderPromise) {
    const loaderOptions: APIOptions = {
      key: GOOGLE_MAPS_BROWSER_API_KEY,
      v: "weekly",
      language: "tr",
      region: "TR",
    };

    if (GOOGLE_MAPS_MAP_ID) {
      loaderOptions.mapIds = [GOOGLE_MAPS_MAP_ID];
    }

    setOptions(loaderOptions);

    googleMapsLoaderPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ]).then(([, markerLibrary]) => ({
      googleMaps: google,
      markerLibrary,
    }));
  }

  return googleMapsLoaderPromise;
}

function hasValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function createMarkerContent(options: {
  fillColor: string;
  strokeColor: string;
  glyph: string;
  size: number;
}): HTMLDivElement {
  const markerElement = document.createElement("div");
  markerElement.textContent = options.glyph;
  markerElement.setAttribute("aria-hidden", "true");
  Object.assign(markerElement.style, {
    alignItems: "center",
    backgroundColor: options.fillColor,
    border: `2px solid ${options.strokeColor}`,
    borderRadius: "9999px",
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.22)",
    boxSizing: "border-box",
    color: "#ffffff",
    display: "flex",
    fontSize: options.size >= 16 ? "11px" : "10px",
    fontWeight: "700",
    height: `${options.size}px`,
    justifyContent: "center",
    lineHeight: "1",
    width: `${options.size}px`,
  });

  return markerElement;
}

function fitMapToPoints(
  map: google.maps.Map,
  googleMaps: typeof google,
  points: MapPoint[]
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

function clearMapOverlays(
  markers: google.maps.marker.AdvancedMarkerElement[],
  polylines: google.maps.Polyline[]
) {
  markers.forEach((marker) => {
    marker.map = null;
  });
  polylines.forEach((polyline) => polyline.setMap(null));
}

export default function OpenRequestsMapPanel({
  requests,
  selectedCarrierRoute,
  maxSapmaKm = null,
  selectedRequestId,
  onRequestSelect,
  hideHeader = false,
  isVisible = true,
  resizeSignal = 0,
}: OpenRequestsMapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapHostElementRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const activeVisiblePointsRef = useRef<MapPoint[]>([]);
  const [mapElement, setMapElement] = useState<HTMLDivElement | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const handleMapElementRef = useCallback((node: HTMLDivElement | null) => {
    setMapElement(node);
  }, []);

  const clearCurrentMapOverlays = useCallback(() => {
    clearMapOverlays(markersRef.current, polylinesRef.current);
    markersRef.current = [];
    polylinesRef.current = [];
    activeVisiblePointsRef.current = [];
  }, []);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const renderableRequestCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          hasValidCoordinate(request.baslangicEnlem, request.baslangicBoylam) &&
          hasValidCoordinate(request.varisEnlem, request.varisBoylam)
      ).length,
    [requests]
  );

  useEffect(() => {
    let isMounted = true;

    if (IS_GOOGLE_MAPS_BROWSER_KEY_MISSING) {
      return;
    }

    if (!mapElement) {
      clearCurrentMapOverlays();
      mapRef.current = null;
      mapHostElementRef.current = null;
      return;
    }

    const initializeMap = async () => {
      try {
        const { googleMaps } = await loadGoogleMaps();

        if (!isMounted) {
          return;
        }

        const shouldCreateMap =
          !mapRef.current || mapHostElementRef.current !== mapElement;

        if (shouldCreateMap) {
          clearCurrentMapOverlays();
          mapRef.current = new googleMaps.maps.Map(mapElement, {
            center: DEFAULT_CENTER,
            zoom: MAP_DEFAULT_ZOOM,
            mapId: GOOGLE_MAPS_MAP_ID || googleMaps.maps.Map.DEMO_MAP_ID,
            renderingType: googleMaps.maps.RenderingType.RASTER,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
          mapHostElementRef.current = mapElement;
        }

        setIsMapReady(true);
        if (shouldCreateMap) {
          setMapRevision((currentRevision) => currentRevision + 1);
        }
        setLoadErrorMessage(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setLoadErrorMessage(
          "Harita su anda yuklenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void initializeMap();

    return () => {
      isMounted = false;
    };
  }, [clearCurrentMapOverlays, mapElement]);

  useEffect(() => {
    return () => {
      clearCurrentMapOverlays();
      mapRef.current = null;
      mapHostElementRef.current = null;
    };
  }, [clearCurrentMapOverlays]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    let isCancelled = false;

    const renderMapState = async () => {
      try {
        const { googleMaps, markerLibrary } = await loadGoogleMaps();

        if (isCancelled || !mapRef.current) {
          return;
        }

        const map = mapRef.current;

        clearCurrentMapOverlays();

        const allVisiblePoints: MapPoint[] = [];

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

          const routeStartMarker = new markerLibrary.AdvancedMarkerElement({
            map,
            position: routeStart,
            title: "Rota baslangici",
            zIndex: 10,
            anchorLeft: "-50%",
            anchorTop: "-50%",
            content: createMarkerContent({
              fillColor: "#2563eb",
              strokeColor: "#1d4ed8",
              glyph: "B",
              size: 16,
            }),
          });

          const routeEndMarker = new markerLibrary.AdvancedMarkerElement({
            map,
            position: routeEnd,
            title: "Rota varisi",
            zIndex: 10,
            anchorLeft: "-50%",
            anchorTop: "-50%",
            content: createMarkerContent({
              fillColor: "#1d4ed8",
              strokeColor: "#172554",
              glyph: "V",
              size: 16,
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

          const pickupMarker = new markerLibrary.AdvancedMarkerElement({
            map,
            position: pickup,
            title: `${request.id} pickup`,
            zIndex: isSelected ? 30 : 20,
            gmpClickable: true,
            anchorLeft: "-50%",
            anchorTop: "-50%",
            content: createMarkerContent({
              fillColor: isSelected ? "#16a34a" : "#22c55e",
              strokeColor: isSelected ? "#14532d" : "#15803d",
              glyph: "A",
              size: isSelected ? 16 : 12,
            }),
          });

          const dropoffMarker = new markerLibrary.AdvancedMarkerElement({
            map,
            position: dropoff,
            title: `${request.id} dropoff`,
            zIndex: isSelected ? 30 : 20,
            gmpClickable: true,
            anchorLeft: "-50%",
            anchorTop: "-50%",
            content: createMarkerContent({
              fillColor: isSelected ? "#f97316" : "#fb923c",
              strokeColor: isSelected ? "#9a3412" : "#c2410c",
              glyph: "T",
              size: isSelected ? 16 : 12,
            }),
          });

          pickupMarker.addEventListener("gmp-click", () =>
            onRequestSelect(request.id)
          );
          dropoffMarker.addEventListener("gmp-click", () =>
            onRequestSelect(request.id)
          );

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
          const selectedPath: MapPoint[] = [
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
          "Harita su anda yuklenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void renderMapState();

    return () => {
      isCancelled = true;
    };
  }, [
    clearCurrentMapOverlays,
    isMapReady,
    isVisible,
    mapRevision,
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
    let animationFrameId: number | null = null;

    const syncVisibleMapState = async () => {
      try {
        const { googleMaps } = await loadGoogleMaps();

        if (isCancelled || !mapRef.current) {
          return;
        }

        animationFrameId = requestAnimationFrame(() => {
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
          "Harita su anda yuklenemiyor. Listeyi kullanmaya devam edebilirsin."
        );
      }
    };

    void syncVisibleMapState();

    return () => {
      isCancelled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isMapReady, isVisible, resizeSignal]);

  const hasRenderableContent =
    renderableRequestCount > 0 ||
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
    ? "Harita anahtari tanimli degil. Sonuclari liste uzerinden inceleyebilirsin."
    : loadErrorMessage;

  return (
    <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
      {!hideHeader ? (
        <div className="flex flex-col gap-2.5 border-b border-slate-200 pb-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Harita paneli
              </p>
              <h2 className="text-base font-black tracking-tight text-slate-950 md:text-lg">
                Rota ve aktif talepler
              </h2>
              <p className="text-sm leading-5 text-slate-600">
                Secili talepler haritada birlikte gorunur.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">
                Alis
              </span>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 ring-1 ring-orange-100">
                Teslim
              </span>
              {selectedCarrierRoute ? (
                <>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">
                    Rota baslangici
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 ring-1 ring-indigo-100">
                    Rota varisi
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                {renderableRequestCount} harita kaydi
              </span>
              {selectedCarrierRoute ? (
                <>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {selectedCarrierRoute.baslangicSehri} - {selectedCarrierRoute.varisSehri}
                  </span>
                  {typeof maxSapmaKm === "number" ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100">
                      Maks. sapma {maxSapmaKm} km
                    </span>
                  ) : null}
                  {selectedCarrierRoute.rotaMesafeMetre !== null ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)}
                    </span>
                  ) : null}
                  {selectedCarrierRoute.rotaSureSaniye !== null ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  Rota secimi olmadan genel dagilim
                </span>
              )}
            </div>

            {selectedRequest ? (
              <p className="text-sm font-medium text-slate-600">
                Secili istek
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {mapFallbackMessage ? (
        <div
          className={`${hideHeader ? "" : "mt-3 "}rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800`}
        >
          {mapFallbackMessage}
        </div>
      ) : null}

      {!mapFallbackMessage ? (
        <div className={`${hideHeader ? "" : "mt-3 "}relative`}>
          <div
            ref={handleMapElementRef}
            className="h-[300px] rounded-[0.95rem] border border-slate-200 bg-slate-100 md:h-[340px] xl:h-[360px]"
          />
          {!hasRenderableContent ? (
            <div className="pointer-events-none absolute inset-x-3 top-3 rounded-[0.95rem] border border-dashed border-slate-300 bg-white/95 px-4 py-3 text-center text-sm font-medium text-slate-500 shadow-sm">
              Haritada gosterilecek uygun koordinatli istek bulunmuyor.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
