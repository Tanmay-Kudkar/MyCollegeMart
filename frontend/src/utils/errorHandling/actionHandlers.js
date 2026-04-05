import { getStatusFallbackMessage } from './statusMessages';

// Keyword buckets used to infer user intent from raw backend messages.
export const ACTION_KEYWORDS = {
  export: ['export'],
  download: ['download', 'invoice', 'receipt', 'attachment', 'file'],
  upload: ['upload', 'import'],
  delete: ['delete', 'remove'],
  update: ['update', 'edit', 'modify'],
  create: ['create', 'add', 'generate', 'list', 'listing'],
  save: ['save', 'submit'],
  payment: ['payment', 'pay', 'razorpay', 'refund'],
  auth: ['login', 'logout', 'token', 'session', 'authenticate', 'unauthorized', 'forbidden', 'permission'],
};

// Best-effort action inference to choose context-aware fallback copy.
export function inferAction(message = '') {
  const lowered = String(message).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!lowered) return '';

  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    if (keywords.some((keyword) => lowered.includes(keyword))) {
      return action;
    }
  }

  return '';
}

// Action-aware message fallback so users see reason-oriented guidance.
export function getContextualFallbackMessage(action, status) {
  const statusCode = Number(status);

  if (!action) {
    return getStatusFallbackMessage(statusCode);
  }

  if (action === 'export') {
    if (statusCode === 404 || statusCode === 422) return 'No matching data was found for your selected export filters.';
    if (statusCode === 403) return 'You do not have permission to export this data.';
    return 'The export could not be prepared right now. Please adjust filters or try again.';
  }

  if (action === 'download') {
    if (statusCode === 404) return 'The requested file is not available anymore.';
    if (statusCode === 403) return 'You do not have permission to download this file.';
    return 'The file could not be downloaded right now. Please try again in a moment.';
  }

  if (action === 'upload') {
    if (statusCode === 413) return 'The selected file is too large. Please choose a smaller file.';
    if (statusCode === 415) return 'This file format is not supported. Please choose a valid file type.';
    return 'The file could not be uploaded right now. Please review the file and try again.';
  }

  if (action === 'delete') {
    if (statusCode === 409 || statusCode === 423) return 'This record cannot be removed because it is linked to other data.';
    if (statusCode === 404) return 'This record was already removed.';
    return 'This record could not be removed right now. Please try again.';
  }

  if (action === 'update' || action === 'save') {
    if (statusCode === 422 || statusCode === 400) return 'Some details are invalid. Please review and save again.';
    if (statusCode === 409) return 'Your changes conflict with recent updates. Please refresh and try again.';
    return 'Your changes could not be saved right now. Please try again.';
  }

  if (action === 'create') {
    if (statusCode === 409) return 'This already exists with similar details.';
    if (statusCode === 422 || statusCode === 400) return 'Some details are invalid. Please review and try again.';
    return 'This could not be created right now. Please try again.';
  }

  if (action === 'payment') {
    if (statusCode === 402) return 'Payment is required to complete this action.';
    if (statusCode === 409) return 'This payment could not be processed due to a conflict. Please refresh and try again.';
    if (statusCode === 422 || statusCode === 400) return 'Payment details are invalid. Please review and try again.';
    return 'Payment could not be completed right now. Please try again.';
  }

  if (action === 'auth') {
    if (statusCode === 401) return 'Invalid sign-in details or session expired. Please sign in again.';
    if (statusCode === 403) return 'You do not have permission for this action.';
    return 'Authentication could not be completed right now. Please sign in again.';
  }

  return getStatusFallbackMessage(statusCode);
}
