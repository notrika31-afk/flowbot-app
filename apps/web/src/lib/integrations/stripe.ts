import Stripe from "stripe";

const STRIPE_AUTHORIZE_URL = "https://connect.stripe.com/oauth/authorize";

function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(secret, {
    apiVersion: "2024-06-20",
  });
}

export function buildStripeAuthUrl(params: { redirectUri: string; state: string }) {
  const clientId = process.env.STRIPE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing STRIPE_CLIENT_ID");
  }

  const qs = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: params.redirectUri,
    state: params.state,
  });

  return `${STRIPE_AUTHORIZE_URL}?${qs.toString()}`;
}

export async function exchangeStripeCode(code: string) {
  const stripe = getStripe();
  return stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });
}
