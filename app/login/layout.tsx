import type { Metadata } from "next";

export const metadata: Metadata = {
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx の
  // title.template = "%s | ProofLoop" が自動で付与するため、二重になる。
  title: "ログイン",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
