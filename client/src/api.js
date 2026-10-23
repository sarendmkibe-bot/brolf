const TOKEN_KEY = 'markethub_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

// One helper for every API call: adds the token and turns errors into exceptions
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

// Turns { password: ['Too short'] } into "password: Too short"
export function errorText(err) {
  if (err.details) {
    const lines = Object.entries(err.details).map(([k, v]) => `${k}: ${v.join(', ')}`);
    if (lines.length) return lines.join(' | ');
  }
  return err.message;
}