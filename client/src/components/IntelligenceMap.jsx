import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { resolveMediaUrl } from "../api/dashboardApi.js";

const DEFAULT_CENTER = [22.9734, 78.6569];

const sourceColors = {
  OSINT: "#f6c657",
  HUMINT: "#c66d36",
  IMINT: "#6bc4a7",
};

const getRecordKey = (record) =>
  record?._id || `${record?.sourceDataset || "dataset"}:${record?.externalId || record?.title}`;

const FitBoundsController = ({ records }) => {
  const map = useMap();

  useEffect(() => {
    if (!records.length) {
      map.setView(DEFAULT_CENTER, 5);
      return;
    }

    if (records.length === 1) {
      map.setView([records[0].latitude, records[0].longitude], 8);
      return;
    }

    const bounds = records.map((record) => [record.latitude, record.longitude]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, records]);

  return null;
};

const MapMarker = ({ record, isActive, onHover, onSelect }) => {
  const markerRef = useRef(null);
  const color = sourceColors[record.sourceType] || "#f6c657";

  return (
    <CircleMarker
      ref={markerRef}
      center={[record.latitude, record.longitude]}
      radius={isActive ? 11 : 8}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: isActive ? 0.95 : 0.75,
        weight: isActive ? 3 : 2,
      }}
      eventHandlers={{
        mouseover: () => {
          onHover(record);
          markerRef.current?.openPopup();
        },
        mouseout: () => markerRef.current?.closePopup(),
        click: () => onSelect(record),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1} sticky>
        {record.title}
      </Tooltip>
      <Popup className="map-popup" autoPan={false} closeButton={false}>
        <div className="popup-card">
          <span className={`source-tag ${record.sourceType.toLowerCase()}`}>{record.sourceType}</span>
          <strong>{record.title}</strong>
          <p>{record.locationName || "Unknown location"}</p>
          {record.mediaUrl ? (
            <img
              src={resolveMediaUrl(record.mediaUrl)}
              alt={record.title}
              className="popup-image"
            />
          ) : (
            <div className="popup-placeholder">No imagery attached</div>
          )}
          <div className="popup-meta">
            <span>Confidence {record.confidence}%</span>
            <span>{new Date(record.eventTime).toLocaleString()}</span>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
};

const IntelligenceMap = ({ records, activeRecord, onHover, onSelect }) => {
  const memoizedRecords = useMemo(() => records, [records]);

  return (
    <section className="map-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Operational Picture</span>
          <h2>Terrain-Anchored Fusion Map</h2>
        </div>
        <p>{records.length} visible nodes</p>
      </div>

      <div className="map-shell">
        <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="fusion-map">
          <TileLayer
            attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
          <ScaleControl position="bottomleft" />
          <FitBoundsController records={memoizedRecords} />
          {memoizedRecords.map((record) => (
            <MapMarker
              key={getRecordKey(record)}
              record={record}
              isActive={getRecordKey(activeRecord) === getRecordKey(record)}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}
        </MapContainer>
      </div>
    </section>
  );
};

export default IntelligenceMap;
