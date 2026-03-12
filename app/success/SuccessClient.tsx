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
    if (!sessionId) return;

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
      if (cancelled) return;

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-80 space-y-4">
        <h1 className="text-lg font-medium">支払いありがとうございます！</h1>

        {sessionId ? (
          <p className="text-sm text-gray-500">
            {status === "confirming" && "反映中..."}
            {status === "confirmed" && "Pro が有効になりました。"}
            {status === "error" && "反映に失敗しました。"}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            セッション情報が見つかりませんでした。
          </p>
        )}

        {message ? (
          <pre className="text-xs text-red-600 whitespace-pre-wrap wrap-break-word">
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

