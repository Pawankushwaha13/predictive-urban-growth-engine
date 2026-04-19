const DashboardHeader = ({ storageMode, summary, onSeed, actionBusy }) => (
  <header className="hero-card">
    <div className="hero-copy">
      <span className="eyebrow">Predictive Urban Growth Engine</span>
      <h1>Spot the next real-estate hotspot before the market fully prices it in.</h1>
      <p>
        This dashboard fuses municipal intent, market demand, and pricing efficiency into a
        single Growth Velocity Score so development teams can prioritize high-conviction
        micro-markets over gut-feel expansion.
      </p>

      <div className="hero-stats">
        <div className="hero-stat">
          <span>Strongest city</span>
          <strong>{summary?.strongestCity?.city || "Calibrating"}</strong>
        </div>
        <div className="hero-stat">
          <span>Tracked signals</span>
          <strong>{summary?.activeMunicipalSignals ?? 0}</strong>
        </div>
        <div className="hero-stat">
          <span>Peak upside</span>
          <strong>{summary?.maxProjectedAppreciationPct ?? 0}%</strong>
        </div>
      </div>
    </div>

    <div className="hero-actions">
      <div className="status-chip">
        <span className={`status-dot ${storageMode === "mongodb" ? "live" : "demo"}`} />
        Storage: {storageMode === "mongodb" ? "MongoDB online" : "Demo fallback active"}
      </div>

      <button className="primary-button" onClick={onSeed} disabled={actionBusy}>
        Load demo hotspots
      </button>

      <p className="hero-note">
        Best used for a 24-to-60 month acquisition horizon with municipal declarations treated
        as lead indicators.
      </p>
    </div>
  </header>
);

export default DashboardHeader;
