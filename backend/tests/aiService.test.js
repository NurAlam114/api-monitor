process.env.GEMINI_API_KEY = '';
process.env.NODE_ENV = 'test';

const { generateAlertMessage, templateAlert } = require('../src/services/aiService');

describe('aiService fallback', () => {
  const record = { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 };
  const anomalies = [
    { type: 'SERVER_ERROR', severity: 'critical', detail: 'x' },
    { type: 'NO_DATA', severity: 'high', detail: 'y' },
  ];

  test('template mentions api name, status and zero records', () => {
    const msg = templateAlert(record, anomalies);
    expect(msg).toContain('AppointmentAPI');
    expect(msg).toContain('500');
    expect(msg).toContain('0 records');
  });

  test('without API key it falls back and never throws', async () => {
    const out = await generateAlertMessage(record, anomalies);
    expect(out.aiGenerated).toBe(false);
    expect(out.message).toContain('AppointmentAPI');
  });
});

describe('aiService retry and model fallback', () => {
  const record = { api_name: 'AppointmentAPI', response_time_ms: 5500, status_code: 500, records_returned: 0 };
  const anomalies = [{ type: 'SERVER_ERROR', severity: 'critical', detail: 'x' }];

  function loadWithMock(generate) {
    jest.resetModules();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'primary';
    process.env.GEMINI_FALLBACK_MODELS = 'backup';
    process.env.AI_RETRY_DELAY_MS = '1';
    jest.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel({ model }) {
          return { generateContent: (p) => generate(model, p) };
        }
      },
    }));
    return require('../src/services/aiService');
  }

  const ok = (text) => ({ response: { text: () => text } });

  test('retries a 503 and succeeds on the same model', async () => {
    let calls = 0;
    const svc = loadWithMock(async () => {
      calls += 1;
      if (calls === 1) throw new Error('[503 Service Unavailable] high demand');
      return ok('AI alert');
    });
    const out = await svc.generateAlertMessage(record, anomalies);
    expect(out).toMatchObject({ aiGenerated: true, model: 'primary', message: 'AI alert' });
    expect(calls).toBe(2);
  });

  test('switches to fallback model when primary keeps failing', async () => {
    const svc = loadWithMock(async (model) => {
      if (model === 'primary') throw new Error('[503 Service Unavailable] high demand');
      return ok('from backup');
    });
    const out = await svc.generateAlertMessage(record, anomalies);
    expect(out).toMatchObject({ aiGenerated: true, model: 'backup' });
  });

  test('uses template when every model fails', async () => {
    const svc = loadWithMock(async () => {
      throw new Error('[503 Service Unavailable]');
    });
    const out = await svc.generateAlertMessage(record, anomalies);
    expect(out.aiGenerated).toBe(false);
    expect(out.message).toContain('AppointmentAPI');
  });
});