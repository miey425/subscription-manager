"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence, number } from "framer-motion";

export default function Home() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [renewalDate, setRenewalDate] = useState("");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

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

  useEffect(() => {
  const getUserAndFetch = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      fetchSubscriptions();
    }
  };

  getUserAndFetch();
}, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
      }
    };

    checkUser();
  }, []);

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
      alert("エラーが発生しました");
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

  const getNextRenewalDate = (sub: any) => {
    const today = new Date();
    let renewal = new Date(sub.renewal_date);

    while (renewal < today) {
      if (sub.billing_cycle === "monthly") {
        renewal.setMonth(renewal.getMonth() + 1);
      } else {
        renewal.setFullYear(renewal.getFullYear() + 1);
      }
    }

    return renewal;
  };

  const getRemainingDays = (sub: any) => {
    const today = new Date();
    const nextRenewal = getNextRenewalDate(sub);

    const diffTime = nextRenewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const yearlyTotal = subscriptions.reduce((sum, sub) => {
    const price = Number(sub.price);

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

            <input
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className="border-b border-gray-300 bg-transparent py-2 outline-none focus:border-black transition"
              required
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="text-sm text-gray-600 hover:text-black transition"
          >
            + Add
          </motion.button>
        </form>

        {/* 年間合計 */}
        <div className="mb-10">
          <div className="text-xs text-gray-400 mb-1">Yearly total</div>
          <div
            className="text-2xl font-semibold tracking-tight
                transition-all duration-300"
          >
            ¥{yearlyTotal.toLocaleString()}
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
