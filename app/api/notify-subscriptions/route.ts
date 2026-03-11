import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

  const today = new Date();
  const threeDaysLater = new Date();

  threeDaysLater.setDate(today.getDate() + 3);

  const { data: subscriptions, error } = await supabase
  .from("subscriptions")
  .select("*")
  .lte("renewal_date", threeDaysLater.toISOString())
  .eq("notified", false)

  console.log("subscriptions:", subscriptions);
  console.log("error:", error);

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