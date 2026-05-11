import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // リクエスト元のホストを取得（vercel本番 or vercel dev）
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    // Stripe Checkout セッションを作成
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_BASIC,
          quantity: 1,
        },
      ],
      // 決済成功時：戻り URL にクエリパラメータ ?upgrade=success
      success_url: `${baseUrl}/?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      // 決済キャンセル時：通常のトップへ
      cancel_url: `${baseUrl}/?upgrade=canceled`,
      // 任意：日本のユーザー向けに JCB 等を有効化したい場合は automatic_payment_methods を使う
      // automatic_payment_methods: { enabled: true },
      locale: "ja",
    });

    // Checkout の URL を返す
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
