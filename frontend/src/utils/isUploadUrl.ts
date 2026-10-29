const UPLOAD_URL_PATTERN = /^\/uploads\/[0-9a-f]{32}\.webp$/;

export function isUploadUrl(value: string): boolean {
  return UPLOAD_URL_PATTERN.test(value);
}
