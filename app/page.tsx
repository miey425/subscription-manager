"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface Subscription {
  id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  renewal_date: string;
}

export default function Home() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [renewalDate, setRenewalDate] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const fetchSubscriptions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data) {
      setSubscriptions(data);
    }
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      await fetchSubscriptions();
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("subscriptions").insert([
      {
        name,
        price: Number(price),
        billing_cycle: billingCycle,
        renewal_date: renewalDate,
        user_id: userData.user?.id,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Failed to add subscription");
    } else {
      setName("");
      setPrice("");
      setBillingCycle("monthly");
      setRenewalDate("");
      fetchSubscriptions();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("削除に失敗しました");
    } else {
      fetchSubscriptions();
    }
  };

  const handleUpgrade = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
    });
  
    if (!res.ok) {
      const text = await res.text();
      console.error("API error", res.status, text);
      return;
    }
  
    const data = await res.json();
    if (!data?.url) {
      console.error("Missing checkout url", data);
      return;
    }

    window.location.href = data.url;
  };

  const getNextRenewalDate = (sub: Subscription) => {
    const today = new Date();
    const renewal = new Date(sub.renewal_date);

    while (renewal < today) {
      if (sub.billing_cycle === "monthly") {
        renewal.setMonth(renewal.getMonth() + 1);
      } else {
        renewal.setFullYear(renewal.getFullYear() + 1);
      }
    }

    return renewal;
  };

  const getRemainingDays = (sub: Subscription) => {
    const today = new Date();
    const nextRenewal = getNextRenewalDate(sub);

    const diffTime = nextRenewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    const price = Number(sub.price) || 0;
    return sum + (sub.billing_cycle === "yearly" ? price / 12 : price);
  }, 0);

  const yearlyTotal = subscriptions.reduce((sum, sub) => {
    const price = Number(sub.price) || 0;
    return sum + (sub.billing_cycle === "monthly" ? price * 12 : price);
  }, 0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-xl px-8 py-16">
        {/* タイトル */}
        <h1 className="text-lg font-medium tracking-tight text-gray-900">
          Subscriptions
        </h1>

        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-black"
        >
          Logout
        </button>

        <button onClick={handleUpgrade}>
          ⭐ Upgrade to Pro ($200/month)
        </button>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-12">
          <input
            type="text"
            placeholder="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-gray-300 bg-transparent py-2 outline-none focus:border-black transition"
            required
          />

          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border-b border-gray-300 bg-transparent py-2 outline-none focus:border-black transition"
            required
          />

          <div className="flex gap-4">
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="border-b border-gray-300 bg-transparent py-2 outline-none focus:border-black transition"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            <div className="flex flex-col">
              <label className="text-sm text-gray-500">
                Payment Date
              </label>

              <input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="w-full border-b border-gray-300 bg-transparent py-2 outline-none focus:border-black transition"
                required
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="text-sm text-gray-600 hover:text-black transition"
          >
            + Add Subscription
          </motion.button>
        </form>

        <div className="mb-10 space-y-5 w-full max-w-xs mx-auto">
          {/* 月額合計 */}
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-sm text-gray-600">Monthly total</div>
            <div
              className="text-2xl font-semibold tracking-tight
                  transition-all duration-300"
            >
              ¥{Math.round(monthlyTotal).toLocaleString()}
            </div>
          </div>

          {/* 年間合計 */}
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-sm text-gray-600">Yearly total</div>
            <div
              className="text-2xl font-semibold tracking-tight
                  transition-all duration-300"
            >
              ¥{yearlyTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 一覧 */}
        <ul className="space-y-6">
          <AnimatePresence>
            {subscriptions.map((sub) => {
              const remainingDays = getRemainingDays(sub);
              const isUrgent = remainingDays <= 3;

              return (
                <motion.li
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  layout
                  className="flex justify-between items-center py-4"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{sub.name}</div>

                    <div className="text-xs text-gray-500">
                      {sub.price}円 /{" "}
                      {sub.billing_cycle === "monthly" ? "Monthly" : "Yearly"}
                    </div>

                    <div
                      className={`text-xs ${
                        isUrgent ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      {remainingDays <= 0
                        ? "Due"
                        : `${remainingDays} days left`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="text-xs text-gray-400 hover:text-black transition"
                  >
                    Remove
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
