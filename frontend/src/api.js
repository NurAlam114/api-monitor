const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function fetchAlerts({ severity, apiName, status } = {}) {
  const params = new URLSearchParams();
  if (severity) params.set('severity', severity);
  if (apiName) params.set('apiName', apiName);
  if (status) params.set('status', status);
  const qs = params.toString();
  return request(`/alerts${qs ? `?${qs}` : ''}`);
}

export function runMonitor(records) {
  return request('/monitor', { method: 'POST', body: JSON.stringify(records) });
}

export function resolveAlert(id) {
  return request(`/alerts/${id}/resolve`, { method: 'PATCH' });
}
