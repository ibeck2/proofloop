import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サークルを探す | ProofLoop",
};

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
