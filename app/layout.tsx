import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <title>サブマネ</title>
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32-transparent.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16-transparent.png" />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
