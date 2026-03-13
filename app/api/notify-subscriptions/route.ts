import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  // ユーザー情報の取得
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  console.log("userId:", userId);

  // 日付の計算
  const today = new Date();
  const threeDaysLater = new Date(today); // todayをコピーして作成
  threeDaysLater.setDate(today.getDate() + 3);

  // usersテーブルから有料プランか確認
  const { data: userRecord } = await supabase
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .single();
  console.log("userRecord:", userRecord);

  if (!userRecord?.is_pro) {
    console.log("無料プランなので通知しません");
    return Response.json({ message: "Free plan, skipping notification" });
  }

  // 更新日が3日以内かつ未通知のサブスクを取得
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .lte("renewal_date", threeDaysLater.toISOString())
    .eq("notified", false);

  if (!subscriptions || subscriptions.length === 0) {
    console.log("対象のサブスクリプションなし");
    return Response.json({ message: "No subscriptions" });
  }

  // メール送信
  for (const sub of subscriptions) {
    console.log("sending email:", sub.name);
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "satomiyabi0425@gmail.com",
      subject: "サブスク更新通知",
      html: `<p>${sub.name} の更新日が近いです</p>`
    });
  }

  // まとめて通知済みに更新
  await supabase
    .from("subscriptions")
    .update({ notified: true })
    .in("id", subscriptions.map((sub) => sub.id));

  return Response.json({ success: true });
}