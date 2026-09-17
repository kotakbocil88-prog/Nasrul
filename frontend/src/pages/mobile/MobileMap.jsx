import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { coordFilled, recordTitle, isTagged, fmtNum } from "@/lib/recordFields";

export default function MobileMap({ records, onOpen }) {
  const points = useMemo(
    () => records.filter((r) => coordFilled(r.koord_x) && coordFilled(r.koord_y)),
    [records]
  );

  const center = useMemo(() => {
    if (points.length === 0) return [-0.5, 101.5];
    const lat = points.reduce((s, r) => s + Number(r.koord_y), 0) / points.length;
    const lng = points.reduce((s, r) => s + Number(r.koord_x), 0) / points.length;
    return [lat, lng];
  }, [points]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Peta Lokasi</div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: "#059669" }} /> Sudah</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Belum</span>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height: "70vh" }}>
        {points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-100">
            Belum ada lokasi dengan koordinat.
          </div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} preferCanvas>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satelit">
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Peta Jalan">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            {points.map((r) => {
              const tg = isTagged(r);
              return (
                <CircleMarker
                  key={r._id}
                  center={[Number(r.koord_y), Number(r.koord_x)]}
                  radius={7}
                  pathOptions={{ color: tg ? "#059669" : "#f59e0b", fillColor: tg ? "#10b981" : "#fbbf24", fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold">{recordTitle(r)}</div>
                      <div>X: {fmtNum(r.koord_x)} | Y: {fmtNum(r.koord_y)}</div>
                      <button
                        onClick={() => onOpen(r)}
                        className="mt-1 px-2 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        Buka Data
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
      <div className="text-xs text-slate-500 text-center">{points.length} lokasi ber-koordinat</div>
    </div>
  );
}
