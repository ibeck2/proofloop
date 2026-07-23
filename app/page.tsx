import type { Metadata } from "next";
import UpcomingEvents from "@/components/UpcomingEvents";
import Hero from "@/components/home/Hero";
import DirectoryPreview from "@/components/home/DirectoryPreview";
import CategoryEntries from "@/components/home/CategoryEntries";
import CampusLifeEntries from "@/components/home/CampusLifeEntries";
import ForClubsCallout from "@/components/home/ForClubsCallout";
import { getHomeData } from "@/lib/home/homeData";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "学生団体を探す｜大学別・分野別に見つかる",
  description:
    "全国の大学の学生団体を大学別・分野別に掲載。サークル・研究会・学祭実行委員会を探せます。GPA計算機や単位・お金のガイドも。",
};

export default async function Page() {
  const home = await getHomeData();

  return (
    <div className="bg-paper text-graphite min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1100px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-16 md:gap-20">
        <Hero
          organizations={home.heroOrganizations}
          totalOrganizations={home.totalOrganizations}
          universityCount={home.universityCounts.length}
        />
        <DirectoryPreview universityCounts={home.universityCounts} />
        <CategoryEntries categories={home.categoryCounts} />
        <CampusLifeEntries />
        <UpcomingEvents />
        <ForClubsCallout />
      </main>
    </div>
  );
}
