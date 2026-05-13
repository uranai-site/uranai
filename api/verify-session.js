import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { session_id } = req.body;
    if (!session_id || typeof session_id !== "string") {
      return res.status(400).json({ error: "session_id is required" });
    }

    // Stripe から実際のセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // 決済状態を確認
    // - payment_status: "paid" / "unpaid" / "no_payment_required"
    // - status: "complete" / "open" / "expired"
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    const complete = session.status === "complete";

    return res.status(200).json({
      verified: paid && complete,
      payment_status: session.payment_status,
      status: session.status,
      // 必要に応じて customer_id, subscription_id なども返せる
      customer_id: session.customer || null,
      subscription_id: session.subscription || null,
    });
  } catch (error) {
    console.error("verify-session error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
