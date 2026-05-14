import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customer_id } = req.body;
    if (!customer_id || typeof customer_id !== "string") {
      return res.status(400).json({ error: "customer_id is required" });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    // Stripe Customer Portal セッションを作成
    // 戻り先 URL にクエリ ?portal=return を付けて、戻った後に状態同期できるようにする
    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: `${baseUrl}/?portal=return`,
      locale: "ja",
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Portal error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
