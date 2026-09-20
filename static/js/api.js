// api.js - fetch wrapper untuk API Flask.

import { showToast } from './toast.js';

const BASE_URL = '';
const DEVICE_STORAGE_KEY = 'device_id';
const REQUEST_TIMEOUT = 15_000;
const FALLBACK_ERROR_MESSAGE = 'Gagal memuat data. Coba refresh halaman.';

let initPromise = null;

export class ApiError extends Error {
  constructor(message, { code = 'API_ERROR', fields = null, data = null, status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
    this.data = data;
    this.status = status;
  }
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function buildUrl(path, query) {
  if (!query) return `${BASE_URL}${path}`;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${BASE_URL}${path}?${queryString}` : `${BASE_URL}${path}`;
}

function createTimeoutSignal(externalSignal) {
  const controller = new AbortController();
  let timeoutId;

  const abort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abort, { once: true });
    }
  }

  timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abort);
    },
  };
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function errorFromResponse(response, payload) {
  const error = payload?.error ?? {};
  return new ApiError(
    error.message || FALLBACK_ERROR_MESSAGE,
    {
      code: error.code || `HTTP_${response.status}`,
      fields: error.fields ?? null,
      data: error.data ?? null,
      status: response.status,
    },
  );
}

function attachMeta(data, meta) {
  if (meta == null || (typeof data !== 'object' && typeof data !== 'function') || data === null) {
    return data;
  }

  data.meta = meta;
  return data;
}

function showUnknownError(error) {
  if (error instanceof ApiError && error.message !== FALLBACK_ERROR_MESSAGE) {
    return;
  }
  showToast(FALLBACK_ERROR_MESSAGE, 'error');
}

async function requestJson(path, options, deviceId, retrying) {
  const {
    method = 'GET',
    body,
    query,
    signal: externalSignal,
    headers: customHeaders,
  } = options;
  const timeout = createTimeoutSignal(externalSignal);
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Device-ID': deviceId,
    ...customHeaders,
  };

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      signal: timeout.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await readResponseBody(response);
    if (!response.ok || payload?.success === false) {
      const error = errorFromResponse(response, payload);
      if (!retrying && response.status === 401 && error.code === 'DEVICE_REQUIRED') {
        localStorage.removeItem(DEVICE_STORAGE_KEY);
        await getDeviceId(true);
        return requestJson(path, options, await getDeviceId(), true);
      }
      throw error;
    }

    if (payload?.success === true) {
      return attachMeta(payload.data, payload.meta);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new ApiError('Request dibatalkan.', { code: 'ABORTED' });
      }
      throw new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'TIMEOUT' });
    }
    if (!(error instanceof ApiError)) {
      throw new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' });
    }
    throw error;
  } finally {
    timeout.cleanup();
  }
}

/** Ambil device ID lokal, atau inisialisasi satu kali di server. */
export function getDeviceId(force = false) {
  if (isOffline()) {
    return Promise.reject(new ApiError('Mode offline.', { code: 'OFFLINE' }));
  }

  const storedDeviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (storedDeviceId && !force) return Promise.resolve(storedDeviceId);
  if (initPromise && !force) return initPromise;

  initPromise = fetch(`${BASE_URL}/api/init`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: undefined,
  })
    .then(async (response) => {
      const payload = await readResponseBody(response);
      if (!response.ok || payload?.success === false) {
        throw errorFromResponse(response, payload);
      }

      const deviceId = payload?.data?.device_id;
      if (!deviceId) {
        throw new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'INVALID_INIT_RESPONSE' });
      }
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
      return deviceId;
    })
    .catch((error) => {
      initPromise = null;
      if (error instanceof ApiError) throw error;
      throw new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' });
    });

  return initPromise;
}

/** Request JSON dengan device header, query serialization, timeout, dan retry identity. */
export async function apiFetch(path, options = {}) {
  if (isOffline()) {
    const error = new ApiError('Mode offline.', { code: 'OFFLINE' });
    showToast('Mode Offline - Data tersimpan lokal', 'info');
    throw error;
  }

  try {
    const deviceId = path === '/api/init' ? null : await getDeviceId();
    return await requestJson(path, options, deviceId, false);
  } catch (error) {
    if (error instanceof ApiError && ['OFFLINE', 'TIMEOUT', 'NETWORK_ERROR'].includes(error.code)) {
      showUnknownError(error);
    } else if (!(error instanceof ApiError)) {
      showUnknownError(error);
    }
    throw error;
  }
}

/** POST endpoint binary dan mulai download tanpa meninggalkan object URL. */
export async function apiDownload(path, body, filename) {
  if (isOffline()) {
    const error = new ApiError('Mode offline.', { code: 'OFFLINE' });
    showToast('Mode Offline - Data tersimpan lokal', 'info');
    throw error;
  }

  const timeout = createTimeoutSignal();
  try {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Device-ID': await getDeviceId(),
      },
      signal: timeout.signal,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await readResponseBody(response);
      throw errorFromResponse(response, payload);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'export-keuangan';
      link.click();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'TIMEOUT' });
    }
    const normalizedError = error instanceof ApiError
      ? error
      : new ApiError(FALLBACK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' });
    showUnknownError(normalizedError);
    throw normalizedError;
  } finally {
    timeout.cleanup();
  }
}

/** Jalankan loader dan sediakan retry sederhana pada elemen yang diberikan. */
export async function withLoading(element, fn) {
  if (!element) return fn();

  element.setAttribute('aria-busy', 'true');
  element.classList.add('is-loading');
  try {
    return await fn();
  } catch (error) {
    element.textContent = '';
    const message = document.createElement('p');
    message.className = 'api-error-message';
    message.textContent = error.message || FALLBACK_ERROR_MESSAGE;

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'btn btn-secondary';
    retryButton.textContent = 'Coba lagi';
    retryButton.addEventListener('click', () => withLoading(element, fn));

    element.append(message, retryButton);
    throw error;
  } finally {
    element.setAttribute('aria-busy', 'false');
    element.classList.remove('is-loading');
  }
}

export const api = {
  get: (path, options = {}) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => apiFetch(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' }),
};
