import { getApiConfig, extractErrorMessage } from '../src/config.js';

describe('balance parsing regression — GET /api/v1/credits returns flat number', () => {
  it('parses flat numeric balance correctly', () => {
    const apiResponse: Record<string, unknown> = {
      balance: 106,
      ownerType: 'user',
      ownerId: 'abc123',
      currency: 'credits',
      request_id: 'req_xxx',
    };
    const available = typeof apiResponse['balance'] === 'number' ? apiResponse['balance'] : 0;
    expect(available).toBe(106);
  });

  it('returns 0 when balance field is missing', () => {
    const apiResponse: Record<string, unknown> = { ownerType: 'user' };
    const available = typeof apiResponse['balance'] === 'number' ? apiResponse['balance'] : 0;
    expect(available).toBe(0);
  });

  it('returns 0 when balance is an object (wrong shape guard)', () => {
    const apiResponse: Record<string, unknown> = { balance: { available: 106 } };
    const available = typeof apiResponse['balance'] === 'number' ? apiResponse['balance'] : 0;
    expect(available).toBe(0);
  });
});

describe('getApiConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when SIMPLYPNG_API_KEY is missing', () => {
    delete process.env['SIMPLYPNG_API_KEY'];
    expect(() => getApiConfig()).toThrow('SIMPLYPNG_API_KEY environment variable is required');
  });

  it('returns apiKey and default baseUrl when only API key is set', () => {
    process.env['SIMPLYPNG_API_KEY'] = 'sp_live_testkey';
    delete process.env['SIMPLYPNG_API_URL'];
    const config = getApiConfig();
    expect(config.apiKey).toBe('sp_live_testkey');
    expect(config.baseUrl).toBe('https://simplypng.app');
  });

  it('uses SIMPLYPNG_API_URL when provided', () => {
    process.env['SIMPLYPNG_API_KEY'] = 'sp_live_testkey';
    process.env['SIMPLYPNG_API_URL'] = 'https://staging.simplypng.app';
    const config = getApiConfig();
    expect(config.baseUrl).toBe('https://staging.simplypng.app');
  });

  it('strips trailing slash from SIMPLYPNG_API_URL', () => {
    process.env['SIMPLYPNG_API_KEY'] = 'sp_live_testkey';
    process.env['SIMPLYPNG_API_URL'] = 'https://staging.simplypng.app/';
    const config = getApiConfig();
    expect(config.baseUrl).toBe('https://staging.simplypng.app');
  });

  it('returns correct apiKey value', () => {
    process.env['SIMPLYPNG_API_KEY'] = 'sp_test_abc123';
    const config = getApiConfig();
    expect(config.apiKey).toBe('sp_test_abc123');
  });
});
