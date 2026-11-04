// OIDC token + userinfo shapes returned by the Logto identity provider.
// We talk to Logto's OIDC endpoints directly (no SDK), so these mirror the
// standard OAuth 2.0 / OpenID Connect responses.

/** Response from the token endpoint (authorization_code and refresh_token grants). */
export interface LogtoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  // Optional: the spec allows refresh-token responses to omit the id_token.
  id_token?: string;
  refresh_token?: string;
}

/** Claims returned by the userinfo endpoint (/oidc/me) and inside the id_token. */
export interface LogtoUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  username?: string;
  picture?: string;
  roles?: string[];
  custom_data?: Record<string, unknown> | null;
}

/** A single JSON Web Key from the issuer's JWKS (EC for ES*, RSA for RS*). */
export interface Jwk {
  kid?: string;
  kty: string;
  alg?: string;
  // RSA key material
  n?: string;
  e?: string;
  // EC key material
  crv?: string;
  x?: string;
  y?: string;
}

/** Decoded id_token payload claims we validate. */
export interface LogtoIdTokenClaims {
  iss: string;
  aud: string | string[];
  azp?: string;
  exp: number;
  iat?: number;
  nbf?: number;
  sub: string;
  nonce?: string;
}

/**
 * Full id_token payload: the validated OIDC claims plus the user-profile claims
 * (present with the profile/email/roles/custom_data scopes), so the session can
 * be built from the id_token without a userinfo round-trip.
 */
export type IdTokenPayload = LogtoIdTokenClaims & LogtoUserInfo;
