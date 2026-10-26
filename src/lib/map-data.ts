import { hasCoordinates } from "./travel-utils";

export const WEB_MERCATOR_MAX_LAT = 85.0511287798066;
export const MAP_LAYERS = {
  street: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    minZoom: 2, maxZoom: 19, maxNativeZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  },
  satellite: {
    // KVP is the working public endpoint; the service's advertised REST template returns HTTP 400.
    url: "https://wmts.terrascope.be/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=esa-worldcover-s2rgbnir-10m-2021-v2_tcc&STYLE=default&FORMAT=image%2Fpng&TILEMATRIXSET=EPSG%3A3857&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME=2021-01-01",
    minZoom: 8, maxZoom: 16, maxNativeZoom: 14,
    attribution: '&copy; <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener noreferrer">ESA WorldCover project 2021</a> / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium &middot; <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> &middot; <a href="https://terrascope.be/en" target="_blank" rel="noopener noreferrer">Terrascope</a>',
  },
} as const;
export type MapLayer = keyof typeof MAP_LAYERS;

export function hasMapCoordinates(point: { lat?: number; lon?: number } | null | undefined): point is { lat: number; lon: number } {
  return hasCoordinates(point) && Math.abs(point.lat) <= WEB_MERCATOR_MAX_LAT;
}

export function satelliteCovers(point: { lat?: number; lon?: number } | null | undefined): boolean {
  return hasMapCoordinates(point) && point.lat >= -60 && point.lat <= 83;
}

/** XYZ / EPSG:3857, with longitude as tile column and north-origin latitude as tile row. */
export function satelliteTile(point: { lat: number; lon: number }, zoom = 14): { x: number; y: number; url: string } | null {
  if (!satelliteCovers(point) || !Number.isInteger(zoom) || zoom < 8 || zoom > 14) return null;
  const n = 2 ** zoom;
  const x = Math.min(n - 1, Math.floor((point.lon + 180) / 360 * n));
  const y = Math.floor((1 - Math.asinh(Math.tan(point.lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { x, y, url: MAP_LAYERS.satellite.url.replace("{z}", String(zoom)).replace("{x}", String(x)).replace("{y}", String(y)) };
}

export function coordinateMapUrl(point: { lat?: number; lon?: number } | null | undefined): string | null {
  return hasMapCoordinates(point) ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lon}` : null;
}

export function mapLinkPoint(focus: [number, number] | null, primary: { lat: number; lon: number } | undefined, view: { lat?: number; lon?: number }) {
  const focused = focus ? { lat: focus[0], lon: focus[1] } : null;
  return hasMapCoordinates(focused) ? focused : hasMapCoordinates(primary) ? primary : hasMapCoordinates(view) ? view : null;
}
