import { resolveMediaUrl } from "../api/dashboardApi.js";

const getRecordKey = (record) =>
  record?._id || `${record?.sourceDataset || "dataset"}:${record?.externalId || record?.title}`;

const IntelFeed = ({ records, activeRecord, onSelect }) => {
  const featuredRecord = activeRecord || records[0];

  return (
    <section className="intel-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Analyst Focus</span>
          <h2>Node Inspection</h2>
        </div>
      </div>

      {featuredRecord ? (
        <article className="intel-detail">
          <div className="intel-detail-media">
            {featuredRecord.mediaUrl ? (
              <img
                src={resolveMediaUrl(featuredRecord.mediaUrl)}
                alt={featuredRecord.title}
              />
            ) : (
              <div className="intel-detail-placeholder">No attached imagery</div>
            )}
          </div>

          <div className="intel-detail-body">
            <span className={`source-tag ${featuredRecord.sourceType.toLowerCase()}`}>
              {featuredRecord.sourceType}
            </span>
            <h3>{featuredRecord.title}</h3>
            <p>{featuredRecord.description || "No description supplied."}</p>
            <div className="detail-grid">
              <span>Location</span>
              <strong>{featuredRecord.locationName || "Unknown"}</strong>
              <span>Coordinates</span>
              <strong>
                {featuredRecord.latitude}, {featuredRecord.longitude}
              </strong>
              <span>Confidence</span>
              <strong>{featuredRecord.confidence}%</strong>
              <span>Observed</span>
              <strong>{new Date(featuredRecord.eventTime).toLocaleString()}</strong>
            </div>
            {featuredRecord.tags?.length ? (
              <div className="tag-row">
                {featuredRecord.tags.map((tag) => (
                  <span key={tag} className="intel-tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ) : (
        <div className="empty-state">No intelligence nodes match the current filters.</div>
      )}

      <div className="intel-feed-list">
        {records.map((record) => (
          <button
            type="button"
            key={getRecordKey(record)}
            className={`feed-item ${
              getRecordKey(featuredRecord) === getRecordKey(record) ? "active" : ""
            }`}
            onClick={() => onSelect(record)}
          >
            <span className={`source-tag ${record.sourceType.toLowerCase()}`}>{record.sourceType}</span>
            <strong>{record.title}</strong>
            <small>
              {record.locationName || "Unknown location"} · {new Date(record.eventTime).toLocaleDateString()}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
};

export default IntelFeed;
