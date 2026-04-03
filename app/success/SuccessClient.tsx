"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<
    "idle" | "confirming" | "confirmed" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setStatus("confirming");
      setMessage(null);

      const res = await fetch("/api/confirm-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const text = await res.text();
      if (cancelled) {
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setMessage(text);
        return;
      }

      setStatus("confirmed");
      setMessage(null);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-80 space-y-4">
        <h1 className="text-lg font-medium">決済ありがとうございます</h1>

        {sessionId ? (
          <p className="text-sm text-gray-500">
            {status === "confirming" && "購入内容を確認しています..."}
            {status === "confirmed" && "PROプランを有効化しました。"}
            {status === "error" && "有効化処理に失敗しました。"}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            セッション情報が見つかりませんでした。
          </p>
        )}

        {message ? (
          <pre className="wrap-break-word whitespace-pre-wrap text-xs text-red-600">
            {message}
          </pre>
        ) : null}

        <Link href="/" className="text-sm text-gray-600 hover:text-black">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
