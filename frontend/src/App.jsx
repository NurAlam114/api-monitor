import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAlerts, resolveAlert, runMonitor } from './api.js';
import { sampleRecords } from './sampleData.js';
import SummaryCards from './components/SummaryCards.jsx';
import AlertItem from './components/AlertItem.jsx';
import Filters from './components/Filters.jsx';

const POLL_MS = 15000;

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, critical: 0, high: 0, medium: 0 });
  const [filters, setFilters] = useState({ severity: '', apiName: '', status: 'active' });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const [apiNames, setApiNames] = useState([]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const data = await fetchAlerts(filtersRef.current);
      setAlerts(data.alerts);
      setCounts(data.counts);
      setApiNames((prev) => Array.from(new Set([...prev, ...data.alerts.map((a) => a.apiName)])).sort());
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(`Could not load alerts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [filters, load]);

  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  const handleRun = async () => {
    setRunning(true);
    setNotice('');
    try {
      const res = await runMonitor(sampleRecords);
      const s = res.summary;
      setNotice(
        `Processed ${s.processed} APIs: ${s.alertsCreated} new alert(s), ${s.duplicatesSkipped} duplicate(s) skipped, ${s.healthy} healthy.`
      );
      await load({ silent: true });
    } catch (err) {
      setError(`Monitor run failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      await load({ silent: true });
    } catch (err) {
      setError(`Could not resolve alert: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const empty = useMemo(() => !loading && !error && alerts.length === 0, [loading, error, alerts]);

  return (
    <div className="container">
      <header className="topbar">
        <div>
          <h1>API Monitor</h1>
          <p className="sub">
            Anomalies detected from external API health reports
            {lastUpdated && <> &middot; updated {lastUpdated.toLocaleTimeString()}</>}
          </p>
        </div>
        <div className="actions">
          <label className="toggle">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-refresh
          </label>
          <button className="btn" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
          <button className="btn primary" onClick={handleRun} disabled={running}>
            {running ? 'Running...' : 'Run sample monitor'}
          </button>
        </div>
      </header>

      {notice && <div className="banner info">{notice}</div>}
      {error && <div className="banner error">{error}</div>}

      <SummaryCards counts={counts} />
      <Filters filters={filters} onChange={setFilters} apiNames={apiNames} />

      {loading && <div className="state">Loading alerts...</div>}
      {empty && (
        <div className="state">
          No alerts found. Click <strong>Run sample monitor</strong> to analyze sample API data.
        </div>
      )}

      <section className="list">
        {alerts.map((a) => (
          <AlertItem key={a._id} alert={a} onResolve={handleResolve} resolving={resolvingId === a._id} />
        ))}
      </section>
    </div>
  );
}
