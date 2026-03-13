import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: { user } } = await supabase.auth.getUser();

const userId = user?.id;

export async function GET() {

  const today = new Date();
  const threeDaysLater = new Date();

  threeDaysLater.setDate(today.getDate() + 3);

  const { data: user } = await supabase
  .from("users")
  .select("is_pro")
  .eq("id", userId)
  .single();

  if (!user?.is_pro) {
    console.log("無料プランなので通知しません");
    return;
  }

  const { data: subscriptions} = await supabase
  .from("subscriptions")
  .select("*")
  .lte("renewal_date", threeDaysLater.toISOString())
  .eq("notified", false)

  if (!subscriptions || subscriptions.length === 0) {
    console.log("subscriptions:", subscriptions);
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

    await supabase
    .from("subscriptions")
    .update({ notified: true })
    .in("id", subscriptions.map((sub) => sub.id));
  }

  return Response.json({ success: true });
}