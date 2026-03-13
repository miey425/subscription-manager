import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {

    // ✅ リクエストのURLからuserIdを受け取る
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    console.log("userId:", userId);

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    // ✅ まず対象ユーザーが有料プランか確認
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("is_pro")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("userエラー:", userError);
      return Response.json({ error: userError.message }, { status: 500 });
    }

    console.log("userRecord:", userRecord);

    // ✅ 無料プランならここで終了
    if (!userRecord?.is_pro) {
      console.log("無料プランなので通知しません");
      return Response.json({ message: "Free plan, skipping notification" });
    }

    // ✅ 有料プランの場合のみサブスクを検索
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("*")
      .lte("renewal_date", threeDaysLater.toISOString())
      .eq("notified", false)
      .eq("user_id", userId); // ← 全員ではなく対象ユーザーだけ

    if (subscriptionsError) {
      console.error("subscriptionsエラー:", subscriptionsError);
      return Response.json({ error: subscriptionsError.message }, { status: 500 });
    }

    console.log("subscriptions:", subscriptions);

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ message: "No subscriptions to notify" });
    }

    for (const sub of subscriptions) {
      console.log("sending email:", sub.name);
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: "satomiyabi0425@gmail.com",
        subject: "サブスク更新通知",
        html: `<p>${sub.name} の更新日が近いです</p>`
      });
    }

    await supabase
      .from("subscriptions")
      .update({ notified: true })
      .in("id", subscriptions.map((sub) => sub.id));

    return Response.json({ success: true });

  } catch (e) {
    console.error("予期しないエラー:", e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}