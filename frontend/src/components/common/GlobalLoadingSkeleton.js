import ProductCardSkeleton from './ProductCardSkeleton';

const SkeletonLine = ({ className = '' }) => (
  <div className={`mcm-skeleton-block mcm-skeleton-shimmer relative rounded-full ${className}`} />
);

const GlobalLoadingSkeleton = ({
  isInitialBoot = false,
  activeRequestCount = 1,
  isReconnecting = false,
  isRetryingRecovery = false,
}) => {
  const statusLabel = activeRequestCount > 1
    ? `${activeRequestCount} requests in progress`
    : 'Loading request';

  const statusMessage = isReconnecting
    ? 'Still reconnecting to the server. Fresh data will sync automatically when connection is restored.'
    : isInitialBoot
      ? 'Waking up the server and preparing your marketplace.'
      : 'Fetching the latest updates for this page.';

  const helperMessage = isRetryingRecovery
    ? 'Retrying in the background. You do not need to refresh this page.'
    : null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100/90 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="mcm-global-loader-glow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-5 sm:px-4 sm:py-8">
        <header className="mcm-skeleton-shimmer relative mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/92">
          <div className="flex items-center gap-3">
            <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <SkeletonLine className="h-3.5 w-36" />
              <SkeletonLine className="h-2.5 w-24" />
            </div>
          </div>

          <div className="hidden gap-2 sm:flex">
            <SkeletonLine className="h-9 w-24 rounded-xl" />
            <SkeletonLine className="h-9 w-24 rounded-xl" />
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/90">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              <span className="mcm-loader-dot h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
              <span className="mcm-loader-dot h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
              <span className="mcm-loader-dot h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
              <span className="ml-1">{statusLabel}</span>
            </span>
            <SkeletonLine className="h-3 w-48" />
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">{statusMessage}</p>
          {helperMessage && (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{helperMessage}</p>
          )}
        </section>

        <main className="grid grid-cols-1 gap-4 md:grid-cols-[240px,1fr]">
          <aside className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/90">
            {[...Array(6)].map((_, index) => (
              <SkeletonLine key={`filter-${index}`} className="h-3.5 w-full" />
            ))}
          </aside>

          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/90">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <ProductCardSkeleton key={`product-${index}`} compact />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default GlobalLoadingSkeleton;
