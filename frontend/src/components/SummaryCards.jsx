const CARDS = [
  { key: 'total', label: 'Active alerts', cls: 'total' },
  { key: 'critical', label: 'Critical', cls: 'critical' },
  { key: 'high', label: 'High', cls: 'high' },
  { key: 'medium', label: 'Medium', cls: 'medium' },
];

export default function SummaryCards({ counts }) {
  return (
    <section className="cards">
      {CARDS.map((c) => (
        <div key={c.key} className={`card ${c.cls}`}>
          <span className="card-label">{c.label}</span>
          <span className="card-value">{counts?.[c.key] ?? 0}</span>
        </div>
      ))}
    </section>
  );
}
