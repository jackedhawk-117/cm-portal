const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Small fetch wrapper. All requests include cookies (JWT is httpOnly).
 * Errors are normalised to ApiError with the server's stable error shape.
 */
async function request(path, { method = 'GET', body, isForm = false, signal } = {}) {
  const options = {
    method,
    credentials: 'include',
    signal,
    headers: {},
  };
  if (body !== undefined) {
    if (isForm) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  let payload = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    payload = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const error = payload?.error || {};
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(
      error.message || `Request failed (${res.status})`,
      res.status,
      error.code || 'REQUEST_FAILED',
      error.details,
    );
  }
  return payload;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  postForm: (path, form, options = {}) =>
    request(path, { ...options, method: 'POST', body: form, isForm: true }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
};

/** Absolute URL for an attachment (the browser sends the auth cookie). */
export const attachmentUrl = (id, download = false) =>
  `${BASE}/attachments/${id}${download ? '?download=1' : ''}`;
