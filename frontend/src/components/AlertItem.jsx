const TYPE_LABELS = {
  HIGH_LATENCY: 'High latency',
  SERVER_ERROR: 'Server error',
  CLIENT_ERROR: 'Client error',
  NO_DATA: 'No data',
  INVALID_RESPONSE: 'Invalid response',
};

function timeAgo(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export default function AlertItem({ alert, onResolve, resolving }) {
  const record = alert.rawData?.record;
  return (
    <article className={`alert ${alert.severity}`}>
      <div className="alert-head">
        <div className="alert-title">
          <span className={`badge ${alert.severity}`}>{alert.severity}</span>
          <h3>{alert.apiName}</h3>
          <span className="type">{TYPE_LABELS[alert.anomalyType] || alert.anomalyType}</span>
        </div>
        <span className="time" title={new Date(alert.createdAt).toLocaleString()}>
          {timeAgo(alert.createdAt)}
        </span>
      </div>

      <p className="message">{alert.message}</p>

      <div className="alert-foot">
        <div className="meta">
          {record && (
            <>
              <span>Status: {record.status_code ?? 'n/a'}</span>
              <span>Time: {record.response_time_ms ?? 'n/a'} ms</span>
              <span>Records: {record.records_returned ?? 'n/a'}</span>
            </>
          )}
          <span className={`source ${alert.aiGenerated ? 'ai' : 'tpl'}`}>
            {alert.aiGenerated ? 'AI generated' : 'Template'}
          </span>
        </div>
        {alert.status === 'active' && (
          <button className="btn small" disabled={resolving} onClick={() => onResolve(alert._id)}>
            {resolving ? 'Resolving...' : 'Mark resolved'}
          </button>
        )}
      </div>
    </article>
  );
}
