import { isWeakSecret } from './security.config';

/**
 * Resolve CORS origins for HTTP and WebSocket.
 * Production: require an explicit allowlist (CORS_ORIGIN and/or FRONTEND_URL).
 * Development: reflect request origin when unset (local DX).
 */
export function resolveCorsOrigin():
  | boolean
  | string
  | string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const fromList = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const frontendUrl = process.env.FRONTEND_URL?.trim();

  if (frontendUrl && !fromList.includes(frontendUrl)) {
    fromList.push(frontendUrl);
  }

  if (fromList.length > 0) {
    return fromList.length === 1 ? fromList[0]! : fromList;
  }

  if (isProduction) {
    return false;
  }

  return true;
}

export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32 || isWeakSecret(jwtSecret)) {
    throw new Error(
      'Production requires JWT_SECRET to be a strong unique secret (min 32 characters; not an example/placeholder value).',
    );
  }

  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (superAdminPassword && isWeakSecret(superAdminPassword)) {
    throw new Error(
      'Production refuses weak SUPER_ADMIN_PASSWORD values (example/placeholder passwords).',
    );
  }

  if (process.env.ALLOW_OPEN_REGISTRATION === 'true') {
    throw new Error(
      'Production refuses to start with ALLOW_OPEN_REGISTRATION=true. Use invitations instead.',
    );
  }

  if (!process.env.CORS_ORIGIN?.trim() && !process.env.FRONTEND_URL?.trim()) {
    throw new Error(
      'Production requires CORS_ORIGIN and/or FRONTEND_URL for the browser allowlist.',
    );
  }
}
