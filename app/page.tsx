"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [renewalDate, setRenewalDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.from("subscriptions").insert([
      {
        name,
        price: Number(price),
        billing_cycle: billingCycle,
        renewal_date: renewalDate,
      },
    ]);

    if (error) {
      console.error(error);
      alert("エラーが発生しました");
    } else {
      alert("追加しました！");
      setName("");
      setPrice("");
      setBillingCycle("monthly");
      setRenewalDate("");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        サブスクリプション追加
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="サービス名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <input
          type="number"
          placeholder="金額"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <select
          value={billingCycle}
          onChange={(e) => setBillingCycle(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="monthly">月額</option>
          <option value="yearly">年額</option>
        </select>

        <input
          type="date"
          value={renewalDate}
          onChange={(e) => setRenewalDate(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded"
        >
          追加する
        </button>
      </form>
    </div>
  );
}