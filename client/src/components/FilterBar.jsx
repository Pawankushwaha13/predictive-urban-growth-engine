const sourceOptions = ["ALL", "OSINT", "HUMINT", "IMINT"];

const FilterBar = ({ filters, onChange }) => (
  <section className="filter-card">
    <div className="filter-block filter-search">
      <label htmlFor="search">Search intelligence</label>
      <input
        id="search"
        type="text"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
        placeholder="Search title, location, tags"
      />
    </div>

    <div className="filter-block">
      <label>Source</label>
      <div className="pill-group">
        {sourceOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={`pill-button ${filters.sourceType === option ? "active" : ""}`}
            onClick={() => onChange({ ...filters, sourceType: option })}
          >
            {option}
          </button>
        ))}
      </div>
    </div>

    <label className="toggle">
      <input
        type="checkbox"
        checked={filters.hasMedia}
        onChange={(event) => onChange({ ...filters, hasMedia: event.target.checked })}
      />
      <span>Only show records with imagery</span>
    </label>
  </section>
);

export default FilterBar;

