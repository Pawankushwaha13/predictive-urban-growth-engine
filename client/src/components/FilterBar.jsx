const FilterBar = ({ filters, cities, marketPhases, onChange }) => (
  <section className="filter-card">
    <div className="filter-block filter-search">
      <label htmlFor="search">Search micro-markets</label>
      <input
        id="search"
        type="text"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
        placeholder="Search zone, city, corridor, or tag"
      />
    </div>

    <div className="filter-block">
      <label>City</label>
      <div className="pill-group">
        {cities.map((city) => (
          <button
            key={city}
            type="button"
            className={`pill-button ${filters.city === city ? "active" : ""}`}
            onClick={() => onChange({ ...filters, city })}
          >
            {city === "ALL" ? "All cities" : city}
          </button>
        ))}
      </div>
    </div>

    <div className="filter-block">
      <label>Market phase</label>
      <div className="pill-group">
        {marketPhases.map((phase) => (
          <button
            key={phase}
            type="button"
            className={`pill-button ${filters.marketPhase === phase ? "active" : ""}`}
            onClick={() => onChange({ ...filters, marketPhase: phase })}
          >
            {phase === "ALL" ? "All phases" : phase}
          </button>
        ))}
      </div>
    </div>

    <div className="filter-block filter-range">
      <label htmlFor="minScore">Minimum growth score: {filters.minScore}</label>
      <input
        id="minScore"
        type="range"
        min="0"
        max="90"
        step="5"
        value={filters.minScore}
        onChange={(event) =>
          onChange({
            ...filters,
            minScore: Number(event.target.value),
          })
        }
      />
    </div>
  </section>
);

export default FilterBar;
