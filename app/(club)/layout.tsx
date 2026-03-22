import { Suspense } from "react";
import ClubSidebar from "@/components/ClubSidebar";
import { ClubOrganizationProvider } from "@/contexts/ClubOrganizationContext";

function ClubShell({ children }: { children: React.ReactNode }) {
  return (
    <ClubOrganizationProvider>
      <div className="relative flex min-h-screen w-full flex-row overflow-x-hidden">
        <ClubSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark">
          <div className="lg:hidden flex items-center justify-end p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <button className="text-slate-600 dark:text-slate-300" type="button" aria-label="メニュー">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
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
    <div
      className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display antialiased min-h-screen"
      style={{ backgroundColor: "#f5f5f8" }}
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-8 text-slate-500">
            読み込み中...
          </div>
        }
      >
        <ClubShell>{children}</ClubShell>
      </Suspense>
    </div>
  );
}
