"use client";

import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import ClubSidebar, { ClubMobileDrawer } from "@/components/ClubSidebar";
import { ClubOrganizationProvider } from "@/contexts/ClubOrganizationContext";

function ClubShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <ClubOrganizationProvider>
      <div className="relative flex min-h-screen w-full flex-row overflow-x-hidden">
        <ClubSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-mist">
          <div className="lg:hidden flex items-center justify-end p-4 bg-paper border-b border-rule sticky top-0 z-20">
            <button
              type="button"
              aria-label={isDrawerOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isDrawerOpen}
              className="text-graphite hover:text-ink transition-colors"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
            >
              {isDrawerOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
        <ClubMobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    </ClubOrganizationProvider>
  );
}

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-mist text-graphite font-body antialiased min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-8 text-graphite/70">
            読み込み中...
          </div>
        }
      >
        <ClubShell>{children}</ClubShell>
      </Suspense>
    </div>
  );
}
