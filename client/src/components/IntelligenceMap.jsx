import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

const DEFAULT_CENTER = [22.9734, 78.6569];

const scoreColor = (score) => {
  if (score >= 80) {
    return "#f97316";
  }

  if (score >= 65) {
    return "#fbbf24";
  }

  if (score >= 50) {
    return "#2dd4bf";
  }

  return "#64748b";
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
      map.setView([records[0].latitude, records[0].longitude], 10);
      return;
    }

    const bounds = records.map((record) => [record.latitude, record.longitude]);
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, records]);

  return null;
};

const MapMarker = ({ record, isActive, onHover, onSelect }) => {
  const color = scoreColor(record.growthVelocityScore);
  const outerRadius = 5000 + (record.heatWeight || 0) * 180;
  const innerRadius = 2400 + (record.heatWeight || 0) * 90;

  return (
    <>
      <Circle
        center={[record.latitude, record.longitude]}
        radius={outerRadius}
        pathOptions={{
          stroke: false,
          fillColor: color,
          fillOpacity: isActive ? 0.16 : 0.1,
        }}
      />
      <Circle
        center={[record.latitude, record.longitude]}
        radius={innerRadius}
        pathOptions={{
          stroke: false,
          fillColor: color,
          fillOpacity: isActive ? 0.26 : 0.18,
        }}
      />
      <CircleMarker
        center={[record.latitude, record.longitude]}
        radius={Math.max(9, Math.round(record.growthVelocityScore / 8))}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: isActive ? 0.92 : 0.74,
          weight: isActive ? 3 : 2,
        }}
        eventHandlers={{
          mouseover: () => onHover(record),
          click: () => onSelect(record),
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={1} sticky>
          {record.title}
        </Tooltip>
        <Popup className="map-popup">
          <div className="popup-card">
            <div className="popup-row">
              <span className={`score-chip band-${String(record.scoreBand || "").toLowerCase().replace(/\s+/g, "-")}`}>
                {record.scoreBand}
              </span>
              <strong>{record.growthVelocityScore}/100</strong>
            </div>
            <h3>{record.title}</h3>
            <p>
              {record.city}
              {record.corridor ? ` · ${record.corridor}` : ""}
            </p>
            <div className="popup-meta">
              <span>{record.marketPhase}</span>
              <span>{record.projectedAppreciationPct}% upside</span>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
};

const IntelligenceMap = ({ records, activeRecord, onHover, onSelect }) => {
  const maxUpside =
    records.length > 0
      ? Math.max(...records.map((record) => record.projectedAppreciationPct || 0))
      : 0;

  return (
    <section className="map-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Spatial Signal</span>
          <h2>Growth Heat Map</h2>
        </div>
        <div className="map-stats">
          <span>{records.length} visible zones</span>
          <strong>{maxUpside}% top upside</strong>
        </div>
      </div>

      <div className="map-shell">
        <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="fusion-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <ScaleControl position="bottomleft" />
          <FitBoundsController records={records} />
          {records.map((record) => (
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

      <div className="heat-legend">
        <span>Heat legend</span>
        <div>
          <i className="legend-dot hotspot" />
          High acceleration
        </div>
        <div>
          <i className="legend-dot growth" />
          Active growth track
        </div>
        <div>
          <i className="legend-dot watch" />
          Watch corridor
        </div>
      </div>
    </section>
  );
};

export default IntelligenceMap;
