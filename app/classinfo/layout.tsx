import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "授業レビューと過去問 | ProofLoop",
};

export default function ClassInfoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
