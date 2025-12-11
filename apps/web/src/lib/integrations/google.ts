import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.owned",
];

function getClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  }
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export function buildGoogleAuthUrl(params: { redirectUri: string; state: string }) {
  const client = getClient(params.redirectUri);
  const url = client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: params.state,
  });
  return url;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const client = getClient(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const profile = await oauth2.userinfo.get();

  return {
    tokens,
    profile: profile.data,
  };
}
