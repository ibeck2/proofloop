export default function SearchLoading() {
  return (
    <div className="bg-white text-slate-900 font-display pb-20 md:pb-0">
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* サイドバー スケルトン */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
            <div className="h-6 bg-slate-200 w-40 animate-pulse" />
            <div className="border-b border-grey-custom/20 pb-6 space-y-3">
              <div className="h-4 bg-slate-200 w-16 animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 bg-slate-100 w-full animate-pulse" />
              ))}
            </div>
            <div className="border-b border-grey-custom/20 pb-6 space-y-3">
              <div className="h-4 bg-slate-200 w-20 animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 bg-slate-100 w-full animate-pulse" />
              ))}
            </div>
            <div className="pb-6 space-y-3">
              <div className="h-4 bg-slate-200 w-12 animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 bg-slate-100 w-full animate-pulse" />
              ))}
            </div>
          </aside>
          {/* メインエリア スケルトン */}
          <section className="flex-1">
            <div className="mb-6 space-y-2">
              <div className="h-8 bg-slate-200 w-32 animate-pulse" />
              <div className="h-4 bg-slate-100 w-48 animate-pulse" />
            </div>
            <div className="mb-4 h-10 bg-slate-100 max-w-md animate-pulse" />
            <div className="mb-8 h-4 bg-slate-100 w-24 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <article key={i} className="bg-white border border-grey-custom/10">
                  <div className="aspect-video bg-slate-200 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="flex gap-2">
                      <span className="h-5 w-14 bg-slate-100 animate-pulse" />
                      <span className="h-5 w-20 bg-slate-100 animate-pulse" />
                    </div>
                    <div className="h-5 bg-slate-200 w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-100 w-1/2 animate-pulse" />
                    <div className="h-4 bg-slate-100 w-20 mt-4 animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
