import Link from "next/link";

export default function Cancel() {
    return (
      <div>
        <h1>支払いはキャンセルされました</h1>
        <Link href="/">戻る</Link>
      </div>
    );
  }