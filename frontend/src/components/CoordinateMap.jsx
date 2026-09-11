import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Konvensi: Koord_X = Longitude (bujur), Koord_Y = Latitude (lintang)
function toPoints(records) {
  return (records || [])
    .map((r) => {
      const lat = parseFloat(String(r.koord_y).replace(",", "."));
      const lng = parseFloat(String(r.koord_x).replace(",", "."));
      return { ...r, lat, lng };
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
        {points.map((p) => (
          <CircleMarker
            key={p._id || `${p.lat}-${p.lng}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: "#0F291E", weight: 2, fillColor: "#84CC16", fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-[#0F291E]">
                  {p.kebun} {p.blok} {p.code_lsu}
                </div>
                <div className="text-gray-600 mt-0.5 font-mono">
                  Lat (Y): {p.koord_y} · Lng (X): {p.koord_x}
                </div>
                {p.id_actual && (
                  <div className="text-gray-500 mt-0.5 font-mono break-all">ID: {p.id_actual}</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
