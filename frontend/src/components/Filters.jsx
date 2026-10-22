export default function Filters({ filters, onChange, apiNames }) {
  return (
    <div className="filters">
      <label>
        Severity
        <select value={filters.severity} onChange={(e) => onChange({ ...filters, severity: e.target.value })}>
          <option value="">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </label>
      <label>
        API
        <select value={filters.apiName} onChange={(e) => onChange({ ...filters, apiName: e.target.value })}>
          <option value="">All</option>
          {apiNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </label>
    </div>
  );
}
