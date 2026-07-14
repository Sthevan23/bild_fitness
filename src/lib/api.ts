export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pep_token') : null;
  const headers = new Headers(options.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('pep_token');
    localStorage.removeItem('pep_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Erro na requisição');
  }
  return data as T;
}
