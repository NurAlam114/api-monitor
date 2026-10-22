const { detectAnomalies } = require('../src/services/anomalyDetector');

const thresholds = { latencyMs: 3000, latencyCriticalMs: 5000 };
const types = (r) => detectAnomalies(r, thresholds).map((a) => a.type);

describe('detectAnomalies', () => {
  test('healthy record has no anomalies', () => {
    const r = { api_name: 'PatientDataAPI', response_time_ms: 1200, status_code: 200, records_returned: 50 };
    expect(detectAnomalies(r, thresholds)).toEqual([]);
  });

  test('PDF example: AppointmentAPI 5500ms, 500, 0 records', () => {
    const r = { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 };
    const found = detectAnomalies(r, thresholds);
    expect(types(r).sort()).toEqual(['HIGH_LATENCY', 'NO_DATA', 'SERVER_ERROR']);
    expect(found.find((a) => a.type === 'HIGH_LATENCY').severity).toBe('critical');
    expect(found.find((a) => a.type === 'SERVER_ERROR').severity).toBe('critical');
  });

  test('moderate latency is high severity', () => {
    const r = { api_name: 'X', response_time_ms: 3800, status_code: 200, records_returned: 5 };
    const found = detectAnomalies(r, thresholds);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ type: 'HIGH_LATENCY', severity: 'high' });
  });

  test('4xx is a medium client error', () => {
    const r = { api_name: 'X', response_time_ms: 100, status_code: 404, records_returned: 3 };
    expect(detectAnomalies(r, thresholds)[0]).toMatchObject({ type: 'CLIENT_ERROR', severity: 'medium' });
  });

  test('zero records on 200 is NO_DATA', () => {
    const r = { api_name: 'X', response_time_ms: 100, status_code: 200, records_returned: 0 };
    expect(types(r)).toEqual(['NO_DATA']);
  });

  test('missing fields are INVALID_RESPONSE', () => {
    expect(types({ api_name: 'X', status_code: 200 })).toContain('INVALID_RESPONSE');
  });

  test('non-object input is INVALID_RESPONSE, does not throw', () => {
    expect(types(null)).toEqual(['INVALID_RESPONSE']);
    expect(types('oops')).toEqual(['INVALID_RESPONSE']);
  });
});
