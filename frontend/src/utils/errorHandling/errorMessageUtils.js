import { inferAction, getContextualFallbackMessage } from './actionHandlers';
import { getStatusFallbackMessage } from './statusMessages';

function cleanMessage(message) {
  return String(message || '').replace(/\s+/g, ' ').trim();
}

function parseMessageFromObject(data) {
  if (!data || typeof data !== 'object') return '';

  const preferredKeys = ['message', 'error', 'detail', 'reason', 'title'];
  for (const key of preferredKeys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function parseCodeFromObject(data) {
  if (!data || typeof data !== 'object') return '';

  const codeKeys = ['code', 'errorCode', 'type'];
  for (const key of codeKeys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    }
  }

  return '';
}

function parseMessageFromRawText(rawText) {
  const text = cleanMessage(rawText);
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    return parseMessageFromObject(parsed) || text;
  } catch {
    return text;
  }
}

function parseCodeFromRawText(rawText) {
  const text = cleanMessage(rawText);
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    return parseCodeFromObject(parsed);
  } catch {
    return '';
  }
}

function getApiSpecificOverride(url, status, action) {
  const normalizedUrl = String(url || '').toLowerCase();
  const statusCode = Number(status);

  if (normalizedUrl.includes('/auth/login') && statusCode === 401) {
    return 'Invalid email or password. Please check and try again.';
  }

  if (normalizedUrl.includes('/auth/register') && statusCode === 409) {
    return 'An account with this email already exists.';
  }

  if (normalizedUrl.includes('/seller/dashboard') && statusCode === 403) {
    return 'Verified merchant access is required for seller dashboard.';
  }

  if (normalizedUrl.includes('/products/listing') && statusCode === 403) {
    return 'Only verified merchant accounts can create listings.';
  }

  if (action === 'auth' && statusCode === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  return '';
}

function applyRetryHint(message, status) {
  const statusCode = Number(status);
  const normalized = cleanMessage(message);
  if (!normalized) return normalized;

  if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
    const lowered = normalized.toLowerCase();
    if (!lowered.includes('retry') && !lowered.includes('try again')) {
      return `${normalized} Please retry in a moment.`;
    }
  }

  return normalized;
}

function normalizeGenericMessage(rawMessage, status, url = '') {
  const message = cleanMessage(rawMessage);
  const inferredAction = inferAction(message);

  if (!message) {
    const apiOverride = getApiSpecificOverride(url, status, inferredAction);
    return applyRetryHint(apiOverride || getStatusFallbackMessage(status), status);
  }

  const lowered = message.toLowerCase();

  if (lowered === 'operation failed' || lowered === 'request failed') {
    const apiOverride = getApiSpecificOverride(url, status, inferredAction);
    return applyRetryHint(apiOverride || getContextualFallbackMessage(inferredAction, status), status);
  }

  if (lowered.startsWith('failed to export')) {
    return applyRetryHint(getContextualFallbackMessage('export', status), status);
  }

  if (lowered.startsWith('failed to download')) {
    return applyRetryHint(getContextualFallbackMessage('download', status), status);
  }

  if (lowered.startsWith('failed to delete')) {
    return applyRetryHint(getContextualFallbackMessage('delete', status), status);
  }

  if (lowered.startsWith('failed to update')) {
    return applyRetryHint(getContextualFallbackMessage('update', status), status);
  }

  if (lowered.startsWith('failed to create')) {
    return applyRetryHint(getContextualFallbackMessage('create', status), status);
  }

  if (lowered.startsWith('unable to ')) {
    return applyRetryHint(getContextualFallbackMessage(inferredAction, status), status);
  }

  if (lowered.includes('network error') || lowered.includes('networkerror') || lowered.includes('failed to fetch')) {
    return 'Connection issue detected. Please check your internet and try again.';
  }

  if (lowered.includes('timeout')) {
    return applyRetryHint('The request took too long. Please try again.', status);
  }

  const apiOverride = getApiSpecificOverride(url, status, inferredAction);
  return applyRetryHint(apiOverride || message, status);
}

function buildErrorCode({ explicitCode, action, status }) {
  if (explicitCode) return explicitCode;

  const statusCode = Number(status);
  if (Number.isFinite(statusCode)) {
    const prefix = action ? `${String(action).toUpperCase()}_` : '';
    return `${prefix}HTTP_${statusCode}`;
  }

  return 'UNKNOWN_ERROR';
}

// Logging hook for diagnostics in development and critical server errors.
export function logError(error, payload) {
  const isDev = Boolean(import.meta?.env?.DEV);
  const statusCode = Number(payload?.status);
  const shouldLog = isDev || (Number.isFinite(statusCode) && statusCode >= 500);
  if (!shouldLog) return;

  // Avoid dumping large objects; keep it compact and actionable.
  console.error('API Error', {
    code: payload?.code,
    status: payload?.status,
    message: payload?.message,
    action: payload?.action,
    url: payload?.url,
    method: error?.config?.method,
  });
}

function buildErrorPayload({ error, fallbackMessage, rawMessage, rawCode }) {
  const status = error?.response?.status;
  const url = error?.config?.url || '';
  const action = inferAction(rawMessage || fallbackMessage || '');
  const message = normalizeGenericMessage(rawMessage || fallbackMessage, status, url);

  const payload = {
    code: buildErrorCode({ explicitCode: rawCode, action, status }),
    message,
    status: Number.isFinite(Number(status)) ? Number(status) : null,
    action,
    url,
    retryable: [429, 503, 504].includes(Number(status)),
  };

  logError(error, payload);
  return payload;
}

// Returns a machine-readable payload and a user-friendly message.
export function getErrorPayload(error, fallbackMessage = '') {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string') {
    return buildErrorPayload({
      error,
      fallbackMessage,
      rawMessage: responseData,
      rawCode: parseCodeFromRawText(responseData),
    });
  }

  if (responseData && typeof responseData === 'object' && !(typeof Blob !== 'undefined' && responseData instanceof Blob)) {
    return buildErrorPayload({
      error,
      fallbackMessage,
      rawMessage: parseMessageFromObject(responseData) || error?.message || fallbackMessage,
      rawCode: parseCodeFromObject(responseData),
    });
  }

  return buildErrorPayload({
    error,
    fallbackMessage,
    rawMessage: error?.message || fallbackMessage,
    rawCode: '',
  });
}

// Synchronous extractor for regular JSON/string Axios error responses.
export function getErrorMessage(error, fallbackMessage = '') {
  return getErrorPayload(error, fallbackMessage).message;
}

// Backward-compatible helper for older call sites that expect parseApiError.
export function parseApiError(error, fallbackMessage = 'An unexpected issue occurred. Please try again.') {
  return getErrorMessage(error, fallbackMessage);
}

// Async extractor for Blob-based error responses (common in export/download APIs).
export async function getErrorPayloadAsync(error, fallbackMessage = '') {
  const responseData = error?.response?.data;

  if (typeof Blob !== 'undefined' && responseData instanceof Blob) {
    try {
      const blobText = await responseData.text();
      return buildErrorPayload({
        error,
        fallbackMessage,
        rawMessage: parseMessageFromRawText(blobText) || fallbackMessage,
        rawCode: parseCodeFromRawText(blobText),
      });
    } catch {
      // Ignore blob parsing errors and continue with normal extraction.
    }
  }

  return getErrorPayload(error, fallbackMessage);
}

export async function getErrorMessageAsync(error, fallbackMessage = '') {
  const payload = await getErrorPayloadAsync(error, fallbackMessage);
  return payload.message;
}

// Utility for normalizing direct UI strings before rendering as error copy.
export function normalizeErrorMessage(message, fallbackMessage = '', options = {}) {
  return normalizeGenericMessage(message || fallbackMessage, options?.status, options?.url);
}
