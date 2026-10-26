"use client";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ExternalLink, Layers, Map as MapIcon } from "lucide-react";
import { MAP_LAYERS, coordinateMapUrl, mapLinkPoint, hasMapCoordinates, satelliteCovers, type MapLayer } from "@/lib/map-data";

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  title: string;
  subtitle?: string;
  color: string;
  label?: string; // pin içindeki yazı (1, 2, H vb.)
  small?: boolean;
}

interface Props {
  center: [number, number];
  markers: MapMarker[];
  route?: [number, number][];
  routeColor?: string;
  focus?: [number, number] | null;
  className?: string;
  primaryMarkerId?: string;
  onMarkerSelect?: (id: string) => void;
}

export default function MapView({
  center,
  markers,
  route,
  routeColor = "#7c4dff",
  focus: requestedFocus,
  className = "",
  primaryMarkerId,
  onMarkerSelect,
}: Props) {
  const { translate } = useLanguage();
  const focus = requestedFocus && hasMapCoordinates({ lat: requestedFocus[0], lon: requestedFocus[1] }) ? requestedFocus : null;
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);

  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapLayer>("street");
  const [layerNotice, setLayerNotice] = useState("");
  const [viewCenter, setViewCenter] = useState({ lat: center?.[0], lon: center?.[1] });
  const markerSelect = useRef(onMarkerSelect);
  markerSelect.current = onMarkerSelect;

  // Haritayı başlat
  useEffect(() => {
    if (!el.current) return;

    // React 19 / HMR remount koruması
    const container = el.current as unknown as { _leaflet_id?: number | null };
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    if (!map.current) {
      const validCenter = hasMapCoordinates({ lat: center?.[0], lon: center?.[1] });
      const initialCenter: [number, number] = validCenter ? center : [0, 0];
      const m = L.map(el.current, {
        center: initialCenter,
        zoom: validCenter ? 13 : 2,
        minZoom: 2,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: true,
      });

      m.attributionControl.setPosition("bottomleft");
      m.attributionControl.setPrefix(false);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      const lg = L.layerGroup().addTo(m);

      map.current = m;
      layer.current = lg;
      m.on("moveend", () => {
        const point = m.getCenter();
        setViewCenter((old) => old.lat === point.lat && old.lon === point.lng ? old : { lat: point.lat, lon: point.lng });
      });

      // Boyutlandırma garantisi (0px gri ekran sorununu önleme)
      m.invalidateSize();
      const t1 = setTimeout(() => m.invalidateSize(), 100);
      const t2 = setTimeout(() => m.invalidateSize(), 350);

      const ro = new ResizeObserver(() => {
        m.invalidateSize();
      });
      ro.observe(el.current);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        ro.disconnect();
        m.remove();
        map.current = null;
        layer.current = null;
        tiles.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Both layers use EPSG:3857 / XYZ. Layer changes never transform hotel coordinates.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const config = MAP_LAYERS[mapStyle];
    m.setMinZoom(config.minZoom);
    m.setMaxZoom(config.maxZoom);
    m.getPane("tilePane")?.classList.toggle("satellite-mode", mapStyle === "satellite");
    setTilesUnavailable(false);
    const next = L.tileLayer(config.url, {
      minZoom: config.minZoom, maxZoom: config.maxZoom, maxNativeZoom: config.maxNativeZoom,
      attribution: config.attribution,
      bounds: mapStyle === "satellite" ? [[-60, -180], [83, 180]] : undefined,
      updateWhenIdle: true, keepBuffer: 1,
    });
    let failed = 0, loaded = 0;
    const loadDeadline = mapStyle === "satellite" ? setTimeout(() => {
      if (loaded === 0) {
        setLayerNotice("Uydu görüntüsü zamanında yüklenemedi; aynı koordinatlarla sokak haritasına dönüldü.");
        setMapStyle("street");
      }
    }, 20000) : null;
    next.on("loading", () => { failed = 0; loaded = 0; });
    next.on("tileerror", () => { failed++; setTilesUnavailable(true); });
    next.on("tileload", () => { loaded++; });
    next.on("load", () => {
      setTilesUnavailable(failed > 0);
      if (mapStyle === "satellite" && failed > 0 && loaded === 0) {
        setLayerNotice("Uydu görüntüsü yüklenemedi; aynı koordinatlarla sokak haritasına dönüldü.");
        setMapStyle("street");
      }
    });
    next.addTo(m);
    tiles.current = next;
    m.invalidateSize();
    return () => { if (loadDeadline) clearTimeout(loadDeadline); next.remove(); next.off(); if (tiles.current === next) tiles.current = null; };
  }, [mapStyle]);

  // Merkez noktası değiştiğinde güncelle
  useEffect(() => {
    if (map.current && hasMapCoordinates({ lat: center?.[0], lon: center?.[1] })) {
      map.current.invalidateSize();
      if (!focus) {
        map.current.setView(center, map.current.getZoom() || 13);
      }
    }
  }, [center?.[0], center?.[1]]);

  // İşaretçileri ve Rota Çizgisini Çiz
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;

    m.invalidateSize();
    g.clearLayers();

    // Rota Çizgisi
    const validRoute = route?.filter(([lat, lon]) => hasMapCoordinates({ lat, lon }));
    if (validRoute && validRoute.length > 1) {
      L.polyline(validRoute, {
        color: routeColor,
        weight: 4,
        opacity: 0.9,
        dashArray: "4 8",
        lineCap: "round",
      }).addTo(g);
    }

    const pts: [number, number][] = [];
    const popupTimers: ReturnType<typeof setTimeout>[] = [];
    const atFocus = (marker: MapMarker) => !!focus && marker.lat === focus[0] && marker.lon === focus[1];
    const focusMarker = markers.find((marker) => marker.id === primaryMarkerId && atFocus(marker)) ?? markers.find(atFocus);

    // Marker'ları çiz
    for (const mk of markers) {
      if (!hasMapCoordinates(mk)) continue;
      const color = /^#[a-f\d]{3,8}$/i.test(mk.color) ? mk.color : "#7c4dff";
      const icon = mk.small
        ? L.divIcon({
            className: "leaflet-marker-custom",
            html: `<div class="dot" style="background:${color};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })
        : L.divIcon({
            className: "leaflet-marker-custom",
            html: `<div class="pin" style="background:${color};"><span>${escapeHtml(mk.label ?? "")}</span></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -28],
          });

      const title = translate(mk.title), subtitle = mk.subtitle ? translate(mk.subtitle) : "";
      const markerInstance = L.marker([mk.lat, mk.lon], { icon, title, alt: title })
        .bindPopup(
          `<div style="font-family: inherit; font-size: 13px; min-width: 140px; padding: 2px;">
            <div style="font-weight: 700; color: #111;">${escapeHtml(title)}</div>
            ${subtitle ? `<div style="color: #666; font-size: 11px; margin-top: 2px;">${escapeHtml(subtitle)}</div>` : ""}
            <div style="color: #666; font-size: 10px; margin-top: 4px;">GPS: ${mk.lat.toFixed(6)}, ${mk.lon.toFixed(6)}</div>
          </div>`
        )
        .addTo(g);
      markerInstance.getElement?.()?.setAttribute("aria-label", title);
      markerInstance.on("click", () => markerSelect.current?.(mk.id));

      if (mk.id === focusMarker?.id) {
        popupTimers.push(setTimeout(() => markerInstance.openPopup(), 200));
      }

      pts.push([mk.lat, mk.lon]);
    }

    if (!focus && pts.length > 1) {
      m.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15, duration: 0.8 });
    } else if (!focus && pts.length === 1) {
      m.flyTo(pts[0], 14, { duration: 0.8 });
    }
    return () => popupTimers.forEach(clearTimeout);
  }, [markers, route, routeColor, focus, primaryMarkerId, translate]);

  // Odaklanılan noktaya yumuşak uçuş
  useEffect(() => {
    if (focus && map.current) {
      map.current.invalidateSize();
      map.current.flyTo(focus, 16, { duration: 0.8 });

    }
  }, [focus]);

  const primary = markers.find((marker) => marker.id === primaryMarkerId && hasMapCoordinates(marker));
  const externalPoint = mapLinkPoint(focus, primary, viewCenter);
  const googleMapsUrl = coordinateMapUrl(externalPoint);
  const canUseSatellite = satelliteCovers(externalPoint);

  useEffect(() => {
    if (mapStyle === "satellite" && !canUseSatellite) {
      setLayerNotice("Bu nokta ücretsiz uydu görüntüsünün kapsamı dışında; sokak haritası gösteriliyor.");
      setMapStyle("street");
    }
  }, [mapStyle, canUseSatellite]);

  return (
    <Localize><div className="relative h-full w-full">
      {/* Harita Katman Değiştirici Butonları */}
      <div className="absolute left-3 top-3 z-[400] flex items-center gap-1.5 rounded-2xl border border-black/10 bg-white/90 p-1 shadow-md backdrop-blur dark:border-white/10 dark:bg-[#0f0e1c]/90">
        <button
          type="button"
          aria-pressed={mapStyle === "street"}
          onClick={() => { setLayerNotice(""); setMapStyle("street"); }}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${mapStyle === "street" ? "bg-brand-500 text-white shadow-sm" : "text-black/60 dark:text-white/60"}`}
        >
          <MapIcon className="h-3 w-3" /> Sokak
        </button>
        <button
          type="button"
          aria-pressed={mapStyle === "satellite"}
          disabled={!canUseSatellite}
          onClick={() => { setLayerNotice(""); setMapStyle("satellite"); }}
          title="Ücretsiz ESA WorldCover / Sentinel-2: 2021 görüntüsü, yaklaşık 10 m çözünürlük. Bina girişi doğrulaması değildir."
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${mapStyle === "satellite" ? "bg-brand-500 text-white shadow-sm" : "text-black/60 dark:text-white/60"}`}
        >
          <Layers className="h-3 w-3" /> Uydu
        </button>
      </div>

      {/* Google Maps'te Aç Butonu */}
      {googleMapsUrl && <div className="absolute right-3 top-3 z-[400]">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={primary || focus ? "Seçili noktanın aynı GPS koordinatını Google Haritalar’da aç" : "Görünen harita merkezini Google Haritalar’da aç"}
          className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-black/70 shadow-md backdrop-blur transition hover:bg-white hover:text-brand-600 dark:border-white/10 dark:bg-[#0f0e1c]/90 dark:text-white/70 dark:hover:bg-black dark:hover:text-brand-400"
        >
          <span>Google Harita</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>}

      {mapStyle === "satellite" && <div className="absolute bottom-16 left-3 z-[400] rounded-lg bg-white/95 px-2 py-1 text-[10px] text-black/70 shadow dark:bg-[#0f0e1c]/95 dark:text-white/70">Sentinel-2 · 2021 · ~10 m · bina girişi için uygun değildir</div>}

      {/* Leaflet DOM Konteyneri */}
      {(tilesUnavailable || layerNotice) && <div role="status" className="absolute bottom-8 left-3 right-14 z-[400] rounded-xl bg-white/95 p-2 text-[11px] text-black/70 shadow dark:bg-[#0f0e1c]/95 dark:text-white/70">{layerNotice || "Bazı harita görüntüleri yüklenemedi. Durak koordinatları değiştirilmedi; internet bağlantısını kontrol edin."}</div>}
      <div
        ref={el}
        style={{ minHeight: "320px", height: "100%", width: "100%", zIndex: 1 }}
        className={`h-full w-full ${className}`}
      />
    </div></Localize>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
