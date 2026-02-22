export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
}

export function getApiConfig(): ApiConfig {
  const apiKey = process.env.SIMPLYPNG_API_KEY;
  if (!apiKey) {
    throw new Error(
      'SIMPLYPNG_API_KEY environment variable is required. ' +
      'Get your API key at https://simplypng.app/dashboard/api-keys'
    );
  }
  const baseUrl = (process.env.SIMPLYPNG_API_URL ?? 'https://simplypng.app').replace(/\/$/, '');
  return { apiKey, baseUrl };
}

export async function apiFetch(
  path: string,
  config: ApiConfig,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
