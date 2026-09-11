import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function coordFilled(raw) {
  if (raw === "") return false;
  const n = parseFloat(raw.replace(",", "."));
  if (Number.isFinite(n) && n === 0) return false; // nilai 0 dianggap belum di-tagging
  return true;
}

// Konvensi: Koord_X = Longitude (bujur), Koord_Y = Latitude (lintang)
function toPoints(records) {
  return (records || [])
    .map((r) => {
      const rawX = r.koord_x === null || r.koord_x === undefined ? "" : String(r.koord_x).trim();
      const rawY = r.koord_y === null || r.koord_y === undefined ? "" : String(r.koord_y).trim();
      const lat = parseFloat(rawY.replace(",", "."));
      const lng = parseFloat(rawX.replace(",", "."));
      const tagged = coordFilled(rawX) && coordFilled(rawY);
      return { ...r, lat, lng, tagged };
    })
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        !(p.lat === 0 && p.lng === 0) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180
    );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (!points.length) return;
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 15);
      } else {
        const bounds = points.map((p) => [p.lat, p.lng]);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [points, map]);
  return null;
}

export default function CoordinateMap({ records, height = 420, interactive = true, testId }) {
  const points = useMemo(() => toPoints(records), [records]);
  const center = points.length ? [points[0].lat, points[0].lng] : [0.5, 110.4];

  if (!points.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl"
        style={{ height }}
        data-testid={testId}
      >
        Belum ada titik koordinat valid untuk ditampilkan di peta.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border" style={{ height }} data-testid={testId}>
      <MapContainer
        center={center}
        zoom={13}
        preferCanvas
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standar (OSM)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelit (Esri)">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <FitBounds points={points} />
        {points.map((p) => {
          const color = p.tagged ? "#0F291E" : "#B45309";
          const fill = p.tagged ? "#84CC16" : "#FCD34D";
          return (
            <CircleMarker
              key={p._id || `${p.lat}-${p.lng}`}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{ color, weight: 2, fillColor: fill, fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold text-[#0F291E]">
                    {p.kebun} {p.blok} {p.code_lsu}
                  </div>
                  <div className="text-gray-600 mt-0.5 font-mono">
                    Lat (Y): {p.koord_y} · Lng (X): {p.koord_x}
                  </div>
                  <div className={`mt-1 font-semibold ${p.tagged ? "text-emerald-700" : "text-amber-700"}`}>
                    {p.tagged ? "Sudah di-tagging" : "Belum di-tagging"}
                  </div>
                  {p.id_actual && (
                    <div className="text-gray-500 mt-0.5 font-mono break-all">ID: {p.id_actual}</div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm rounded-lg border shadow-sm px-3 py-2 text-[11px] space-y-1 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#0F291E", background: "#84CC16" }} />
          <span className="text-gray-700 font-medium">Sudah di-tagging</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#B45309", background: "#FCD34D" }} />
          <span className="text-gray-700 font-medium">Belum di-tagging</span>
        </div>
      </div>
    </div>
  );
}
