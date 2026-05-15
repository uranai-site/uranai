import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 商品定義: item キー → { price 環境変数, mode, 表示名 }
const ITEMS = {
  basic: {
    priceEnv: "STRIPE_PRICE_BASIC",
    mode: "subscription",
    name: "ベーシックプラン",
  },
  lifeTurning: {
    priceEnv: "STRIPE_PRICE_LIFE_TURNING",
    mode: "payment",
    name: "人生の転機鑑定",
  },
  pdf: {
    priceEnv: "STRIPE_PRICE_PDF",
    mode: "payment",
    name: "PDF鑑定書発行",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 後方互換: item 未指定なら basic（サブスク）として扱う
    const { item = "basic" } = req.body || {};
    const itemDef = ITEMS[item];
    if (!itemDef) {
      return res.status(400).json({ error: `Unknown item: ${item}` });
    }

    const priceId = process.env[itemDef.priceEnv];
    if (!priceId) {
      return res.status(500).json({ error: `Price ID not configured: ${itemDef.priceEnv}` });
    }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: itemDef.mode,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // metadata に item を入れる → verify-session で何を買ったか判別できる
      metadata: { item },
      // subscription/payment 両方に対応した metadata 設定
      ...(itemDef.mode === "subscription"
        ? { subscription_data: { metadata: { item } } }
        : { payment_intent_data: { metadata: { item } } }),
      success_url: `${baseUrl}/?upgrade=success&item=${encodeURIComponent(item)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?upgrade=canceled`,
      locale: "ja",
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
