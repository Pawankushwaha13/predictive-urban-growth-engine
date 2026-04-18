const DashboardHeader = ({ storageMode, onSeed, actionBusy }) => (
  <header className="hero-card">
    <div className="hero-copy">
      <span className="eyebrow">Strategic Intelligence Platform</span>
      <h1>Multi-Source Intelligence Fusion Dashboard</h1>
      <p>
        Unified map-based awareness for OSINT, HUMINT, and IMINT with drag-and-drop
        ingestion, live geospatial plotting, and instant hover previews.
      </p>
    </div>

    <div className="hero-actions">
      <div className="status-chip">
        <span className={`status-dot ${storageMode === "mongodb" ? "live" : "demo"}`} />
        Storage: {storageMode === "mongodb" ? "MongoDB online" : "Demo fallback active"}
      </div>
      <button className="ghost-button" onClick={onSeed} disabled={actionBusy}>
        Load sample nodes
      </button>
    </div>
  </header>
);

export default DashboardHeader;

