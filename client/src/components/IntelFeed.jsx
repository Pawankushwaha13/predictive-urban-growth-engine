import { resolveMediaUrl } from "../api/dashboardApi.js";

const getRecordKey = (record) =>
  record?._id || `${record?.sourceDataset || "dataset"}:${record?.externalId || record?.title}`;

const IntelFeed = ({ records, activeRecord, onSelect }) => {
  const featuredRecord = activeRecord || records[0];

  return (
    <section className="intel-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">Investment Readout</span>
          <h2>Zone Detail</h2>
        </div>
      </div>

      {featuredRecord ? (
        <article className="zone-shell">
          {featuredRecord.mediaUrl ? (
            <div className="zone-media">
              <img src={resolveMediaUrl(featuredRecord.mediaUrl)} alt={featuredRecord.title} />
            </div>
          ) : null}

          <div className="zone-header">
            <div>
              <div className="chip-row">
                <span className={`score-chip band-${String(featuredRecord.scoreBand || "").toLowerCase().replace(/\s+/g, "-")}`}>
                  {featuredRecord.scoreBand}
                </span>
                <span className="phase-chip">{featuredRecord.marketPhase}</span>
              </div>
              <h3>{featuredRecord.title}</h3>
              <p>
                {featuredRecord.city}
                {featuredRecord.corridor ? ` · ${featuredRecord.corridor}` : ""}
              </p>
            </div>

            <div className="score-stack">
              <span>Growth score</span>
              <strong>{featuredRecord.growthVelocityScore}/100</strong>
            </div>
          </div>

          <p className="zone-thesis">
            {featuredRecord.insights?.thesis || featuredRecord.description || "No thesis available."}
          </p>

          {featuredRecord.aiSummary ? (
            <div className="ai-summary-card">
              <span className="eyebrow">AI memo</span>
              <h4>{featuredRecord.aiSummary.headline}</h4>
              <p>{featuredRecord.aiSummary.executiveSummary}</p>
              <small>{featuredRecord.aiSummary.recommendation}</small>
            </div>
          ) : null}

          <div className="metric-grid">
            <div>
              <span>Projected upside</span>
              <strong>{featuredRecord.projectedAppreciationPct}%</strong>
            </div>
            <div>
              <span>Horizon</span>
              <strong>{featuredRecord.projectionHorizonMonths} months</strong>
            </div>
            <div>
              <span>Price / sq.ft.</span>
              <strong>{featuredRecord.pricePerSqft?.toLocaleString("en-IN") || 0}</strong>
            </div>
            <div>
              <span>Rental yield</span>
              <strong>{featuredRecord.rentalYieldPct}%</strong>
            </div>
            <div>
              <span>Municipal score</span>
              <strong>{featuredRecord.municipalScore}</strong>
            </div>
            <div>
              <span>Demand score</span>
              <strong>{featuredRecord.demandScore}</strong>
            </div>
          </div>

          <div className="insight-grid">
            <div className="insight-panel">
              <h4>Why it’s attractive</h4>
              <div className="insight-list">
                {(featuredRecord.insights?.drivers || []).map((driver) => (
                  <p key={driver}>{driver}</p>
                ))}
              </div>
            </div>

            <div className="insight-panel">
              <h4>Watch-outs</h4>
              <div className="insight-list">
                {(featuredRecord.insights?.risks || []).length ? (
                  featuredRecord.insights.risks.map((risk) => <p key={risk}>{risk}</p>)
                ) : (
                  <p>Risk profile is moderate relative to the current opportunity score.</p>
                )}
              </div>
            </div>
          </div>

          <div className="signals-panel">
            <h4>Municipal pipeline</h4>
            <div className="signal-list">
              {(featuredRecord.municipalSignals || []).map((signal) => (
                <article key={`${signal.title}-${signal.status}`} className="signal-card">
                  <div className="signal-topline">
                    <strong>{signal.title}</strong>
                    <span>{signal.status}</span>
                  </div>
                  <small>
                    {signal.category} · {signal.monthsToExecution} months · confidence{" "}
                    {signal.confidence}
                  </small>
                </article>
              ))}
            </div>
          </div>

          {(featuredRecord.sourceTrace || []).length ? (
            <div className="signals-panel">
              <h4>Source trace</h4>
              <div className="signal-list">
                {featuredRecord.sourceTrace.map((trace, index) => (
                  <article key={`${trace.label}-${index}`} className="signal-card">
                    <div className="signal-topline">
                      <strong>{trace.label}</strong>
                      <span>{trace.kind}</span>
                    </div>
                    <small>
                      {trace.provider}
                      {trace.note ? ` · ${trace.note}` : ""}
                    </small>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="empty-state">No zones match the current filters.</div>
      )}

      <div className="zone-rank-list">
        {records.map((record, index) => (
          <button
            type="button"
            key={getRecordKey(record)}
            className={`feed-item ${
              getRecordKey(featuredRecord) === getRecordKey(record) ? "active" : ""
            }`}
            onClick={() => onSelect(record)}
          >
            <div className="feed-rank">#{index + 1}</div>
            <div className="feed-copy">
              <strong>{record.title}</strong>
              <small>
                {record.city} · {record.projectedAppreciationPct}% upside
              </small>
            </div>
            <div className="feed-score">{record.growthVelocityScore}</div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default IntelFeed;
