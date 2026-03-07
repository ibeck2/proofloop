import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン | ProofLoop",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
