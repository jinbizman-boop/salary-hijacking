export const UPLOADS_API_PREFIX = "/api/v1/uploads";
export const UPLOADS_DIRECT_PATH = `${UPLOADS_API_PREFIX}/direct`;
export const UPLOADS_MAX_COMMUNITY_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const UPLOADS_MAX_VARIABLE_EXPENSE_RECEIPT_BYTES = 10 * 1024 * 1024;

export const UPLOADS_PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});

export const UPLOADS_COMMUNITY_CONTENT_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const UPLOADS_VARIABLE_EXPENSE_RECEIPT_CONTENT_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
