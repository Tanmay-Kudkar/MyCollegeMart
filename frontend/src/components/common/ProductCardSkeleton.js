const ProductCardSkeleton = ({ compact = false, showAction = true }) => {
  const imageHeightClass = compact ? 'h-36 md:h-40' : 'h-56';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/80 dark:bg-slate-900/95">
      <div className={`mcm-skeleton-block mcm-skeleton-shimmer relative w-full ${imageHeightClass}`} />

      <div className={compact ? 'space-y-2 p-3' : 'space-y-3 p-4'}>
        <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-2.5 w-16 rounded" />
        <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-4 w-full rounded" />
        <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-4 w-4/5 rounded" />

        <div className="flex items-center justify-between gap-2">
          <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-5 w-20 rounded" />
          <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-4 w-12 rounded" />
        </div>

        <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-3 w-1/2 rounded" />

        {showAction && (
          <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-9 w-full rounded-full" />
        )}
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
