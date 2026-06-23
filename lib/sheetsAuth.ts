import { JWT } from "google-auth-library";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_KEY,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  WRITE_BACK_CONFIGURED,
} from "./config";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let cachedClient: JWT | null = null;

function getCredentials(): { email: string; key: string } {
  if (GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
      return { email: parsed.client_email ?? "", key: parsed.private_key ?? "" };
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON.");
    }
  }

  return {
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Env vars typically store the PEM's newlines as the literal two
    // characters "\n" — un-escape them back into real newlines.
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

function getClient(): JWT {
  if (cachedClient) return cachedClient;

  if (!WRITE_BACK_CONFIGURED) {
    throw new Error(
      "Google Sheets write-back isn't configured — set GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const { email, key } = getCredentials();
  if (!email || !key) {
    throw new Error("Google service account credentials are incomplete.");
  }

  cachedClient = new JWT({ email, key, scopes: SCOPES });
  return cachedClient;
}

/**
 * Returns a valid OAuth access token for the Sheets API, reusing the
 * cached one until it's close to expiry (handled internally by
 * google-auth-library's getAccessToken()).
 */
export async function getAccessToken(): Promise<string> {
  const client = getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error("Failed to obtain a Google access token — check the service account credentials.");
  }
  return token;
}
