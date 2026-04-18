const summaryCards = [
  { key: "total", label: "Total Nodes" },
  { key: "OSINT", label: "OSINT" },
  { key: "HUMINT", label: "HUMINT" },
  { key: "IMINT", label: "IMINT" },
  { key: "withMedia", label: "With Imagery" },
];

const SummaryStrip = ({ summary }) => (
  <section className="summary-strip">
    {summaryCards.map((card, index) => (
      <article className="summary-card" key={card.key} style={{ animationDelay: `${index * 80}ms` }}>
        <span>{card.label}</span>
        <strong>{summary?.[card.key] ?? 0}</strong>
      </article>
    ))}
  </section>
);

export default SummaryStrip;

