const summaryCards = (summary) => [
  {
    label: "Zones tracked",
    value: summary?.totalZones ?? 0,
    note: "Micro-markets under watch",
  },
  {
    label: "Avg growth score",
    value: summary?.averageGrowthScore ?? 0,
    note: "Blended municipal + demand signal",
  },
  {
    label: "Hotspots",
    value: summary?.hotspotCount ?? 0,
    note: "Scores above 75",
  },
  {
    label: "Undervalued",
    value: summary?.undervaluedCount ?? 0,
    note: "Yield and pricing dislocation",
  },
  {
    label: "Strongest city",
    value: summary?.strongestCity?.city || "Calibrating",
    note: summary?.strongestCity
      ? `Avg score ${summary.strongestCity.averageGrowthScore}`
      : "Awaiting city comparison",
  },
  {
    label: "Max upside",
    value: `${summary?.maxProjectedAppreciationPct ?? 0}%`,
    note: "Highest projected appreciation",
  },
];

const SummaryStrip = ({ summary }) => (
  <section className="summary-strip">
    {summaryCards(summary).map((card) => (
      <article className="summary-card" key={card.label}>
        <span>{card.label}</span>
        <strong>{card.value}</strong>
        <small>{card.note}</small>
      </article>
    ))}
  </section>
);

export default SummaryStrip;
