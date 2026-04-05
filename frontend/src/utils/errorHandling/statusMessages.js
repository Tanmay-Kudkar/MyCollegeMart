// Human-friendly fallback copy for known HTTP status codes.
export const STATUS_BASED_MESSAGES = {
  // 1xx - Informational responses (request received, still in progress)
  100: 'Your request is being processed. Please wait a moment.',
  101: 'Connection is being upgraded. Please try again in a moment.',
  102: 'Your request is still being processed. Please wait.',
  103: 'The server has started preparing this request. Please continue.',

  // 2xx - Successful responses
  200: 'The request was completed successfully.',
  201: 'The record was created successfully.',
  202: 'Your request was accepted and is being processed.',
  203: 'The request was completed with modified response details.',
  204: 'The request was completed successfully.',
  205: 'The request was completed. Please refresh the form and continue.',
  206: 'Partial data was returned successfully.',

  // 3xx - Redirection responses
  300: 'Multiple result options were found. Please try again.',
  301: 'This resource has moved permanently. Please refresh and try again.',
  302: 'This resource is temporarily redirected. Please try again.',
  303: 'Please retry using the redirected location.',
  304: 'No changes were found since the last request.',
  307: 'Temporary redirect in progress. Please retry the request.',
  308: 'Permanent redirect in progress. Please refresh and retry.',

  // 4xx - Client-side issues (input, auth, permissions, or request format)
  400: 'Some details are missing or invalid. Please review and try again.',
  401: 'Your session has expired. Please sign in again and continue.',
  402: 'Payment is required to continue this action.',
  403: 'You do not have permission to do this action.',
  404: 'The requested record was not found. It may have been removed already.',
  405: 'This action is not allowed for the requested endpoint.',
  406: 'Requested response format is not supported.',
  408: 'The request took too long. Please try again.',
  409: 'This action conflicts with existing data. Please refresh and try again.',
  410: 'This record is no longer available.',
  411: 'Request size information is missing. Please try again.',
  413: 'The file or request is too large. Please reduce size and retry.',
  414: 'The request link is too long. Please retry with fewer filters.',
  415: 'Unsupported file or content type. Please use a valid format.',
  416: 'Requested data range is not available.',
  417: 'The request could not be processed as expected. Please try again.',
  418: 'This request cannot be processed by the server.',
  421: 'The request was sent to the wrong server. Please retry.',
  422: 'Some details are invalid. Please correct them and try again.',
  423: 'This record is currently locked. Please try again later.',
  424: 'This action depends on another failed request. Please retry.',
  425: 'The server is not ready to process this request yet. Please retry.',
  426: 'A protocol upgrade is required to continue.',
  428: 'A required precondition is missing. Please refresh and try again.',
  429: 'Too many requests were made. Please wait a moment and try again.',
  431: 'Request headers are too large. Please retry with a simpler request.',
  451: 'This content is unavailable due to legal restrictions.',

  // 5xx - Server-side issues (temporary outage, upstream failures, or backend errors)
  500: 'Server issue detected. Please try again shortly.',
  501: 'This feature is not available yet.',
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is currently unavailable. Please try again shortly.',
  504: 'The server is taking too long to respond. Please try again.',
  505: 'The HTTP version is not supported by the server.',
  506: 'A server configuration issue occurred. Please try again later.',
  507: 'The server does not have enough storage to complete this action.',
  508: 'The server detected a processing loop. Please try again later.',
  510: 'Additional request extensions are required by the server.',
  511: 'Network authentication is required to continue.',
};

// Primary status fallback with exact code mapping first, then range mapping.
export function getStatusFallbackMessage(status) {
  const statusCode = Number(status);
  if (STATUS_BASED_MESSAGES[statusCode]) return STATUS_BASED_MESSAGES[statusCode];

  if (statusCode >= 100 && statusCode < 200) {
    return 'Your request has been received and is still in progress.';
  }
  if (statusCode >= 200 && statusCode < 300) {
    return 'The request was completed successfully.';
  }
  if (statusCode >= 300 && statusCode < 400) {
    return 'A redirect was required to complete this request.';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'Some request details need attention. Please review and try again.';
  }
  if (statusCode >= 500 && statusCode < 600) {
    return 'Server issue detected. Please try again shortly.';
  }

  return 'Something went wrong. Please try again.';
}
