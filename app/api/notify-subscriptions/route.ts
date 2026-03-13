import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {

    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    // 有料ユーザーを全員取得
    const { data: proUsers, error: proUsersError } = await supabase
      .from("users")
      .select("id")
      .eq("is_pro", true);

    // ✅ エラーが起きたら内容をログに出す
    if (proUsersError) {
      console.error("proUsersエラー:", proUsersError);
      return Response.json({ error: proUsersError.message }, { status: 500 });
    }

    console.log("proUsers:", proUsers);

    if (!proUsers || proUsers.length === 0) {
      return Response.json({ message: "No pro users" });
    }

    const proUserIds = proUsers.map((u) => u.id);

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("*")
      .lte("renewal_date", threeDaysLater.toISOString())
      .eq("notified", false)
      .in("user_id", proUserIds);

    // ✅ エラーが起きたら内容をログに出す
    if (subscriptionsError) {
      console.error("subscriptionsエラー:", subscriptionsError);
      return Response.json({ error: subscriptionsError.message }, { status: 500 });
    }

    console.log("subscriptions:", subscriptions);

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ message: "No subscriptions" });
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
    // ✅ 予期しないエラーもここでキャッチしてResponseを返す
    console.error("予期しないエラー:", e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}