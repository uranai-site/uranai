import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subscription_id } = req.body;
    if (!subscription_id || typeof subscription_id !== "string") {
      return res.status(400).json({ error: "subscription_id is required" });
    }

    const sub = await stripe.subscriptions.retrieve(subscription_id);

    // ステータスの判定
    const activeStatuses = ["active", "trialing", "past_due"];
    const isActive = activeStatuses.includes(sub.status);

    // 解約予約の判定（API バージョンによってフィールドが違うので両対応）
    const willCancel =
      sub.cancel_at_period_end === true ||
      (sub.cancel_at !== null && sub.cancel_at !== undefined && sub.cancel_at > 0) ||
      (sub.cancellation_details && sub.cancellation_details.reason !== null);

    // 解約予定日時の取得（cancel_at 優先、なければ current_period_end）
    // 新しい API では current_period_end が items.data[0] に移動している場合がある
    const cancelAtTs =
      sub.cancel_at ||
      sub.current_period_end ||
      (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end) ||
      null;

    return res.status(200).json({
      active: isActive,
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end,
      cancel_at: sub.cancel_at,
      will_cancel: willCancel,
      cancel_at_ts: cancelAtTs,
      cancellation_details: sub.cancellation_details || null,
    });
  } catch (error) {
    console.error("check-subscription error:", error);
    if (error.code === "resource_missing") {
      return res.status(200).json({ active: false, status: "missing", will_cancel: false });
    }
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
