import Link from "next/link";

export default function Cancel() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-lg font-medium">決済はキャンセルされました</h1>
        <Link href="/" className="text-sm text-gray-600 hover:text-black">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
