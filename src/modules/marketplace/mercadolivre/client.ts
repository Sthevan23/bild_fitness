export const ML_API_BASE = 'https://api.mercadolibre.com';
export const ML_AUTH_BASE = 'https://auth.mercadolivre.com.br';

export function getMlConfig() {
  const clientId = process.env.ML_CLIENT_ID || '';
  const clientSecret = process.env.ML_CLIENT_SECRET || '';
  const redirectUri =
    process.env.ML_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/marketplace/mercadolivre/callback`;
  const configured = Boolean(clientId && clientSecret);
  return { clientId, clientSecret, redirectUri, configured };
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function mlFetch<T = unknown>(
  path: string,
  options: {
    accessToken?: string;
    method?: string;
    body?: Record<string, unknown> | URLSearchParams | string;
    headers?: Record<string, string>;
    retries?: number;
  } = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers || {}),
      };
      if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

      let body: BodyInit | undefined;
      if (options.body instanceof URLSearchParams) {
        body = options.body;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (typeof options.body === 'string') {
        body = options.body;
      } else if (options.body) {
        body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
      }

      const url = path.startsWith('http') ? path : `${ML_API_BASE}${path}`;
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        cache: 'no-store',
      });

      if (res.status === 429 || res.status >= 500) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      const text = await res.text();
      const data = text ? (JSON.parse(text) as T & { message?: string; error?: string }) : ({} as T);

      if (!res.ok) {
        const msg =
          (data as { message?: string }).message ||
          (data as { error?: string }).error ||
          `ML API ${res.status}`;
        throw new Error(msg);
      }
      return data as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }

  throw lastError || new Error('Falha na API Mercado Livre');
}
