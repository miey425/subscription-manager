"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
        console.error(error);
        alert(error.message);
    } else {
        window.location.href = "/";
    }
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
  console.error("Signup error:", error.message);
  alert(error.message);
} else {
      alert("確認メールを送信しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-80 space-y-4">
        <h1 className="text-lg font-medium">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border-b py-2 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border-b py-2 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
        onClick={handleLogin}
        className="text-sm text-gray-600 hover:text-black"
        >
          Login
        </button>

        <button
          onClick={handleSignup}
          className="text-sm text-gray-400 hover:text-black"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
