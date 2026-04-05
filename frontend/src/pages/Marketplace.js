import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/common/ProductCardSkeleton';
import { AcademicCapIcon, SearchIcon, CloseIcon } from '../components/UI/Icons';

const FILTER_SELECT_STYLE = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/80 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-amber-500/40';

const Filters = ({
    categories,
    selectedCategory,
    selectedBranch,
    selectedSemester,
    sortMethod,
    onSelectCategory,
    onSortChange,
    onBranchChange,
    onSemesterChange,
    isPrimeMember,
    activeFilterCount,
    onResetFilters,
    resultCount,
    className = '',
    showCloseButton = false,
    onClose,
    showApplyButton = false,
    onApply,
}) => {
    const branches = [
        'All Branches',
        'Computer Engineering',
        'Civil Engineering',
        'Electronics and Telecommunication Engineering',
        'Information Technology',
        'Instrumentation Engineering',
        'Mechanical Engineering',
        'Artificial Intelligence and Data Science',
        'Computer Science and Engineering (Data Science)',
        'Electronics and Telecommunication Engineering (VLSI)'
    ];
    
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <aside className={`w-full rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900 xl:sticky xl:top-24 xl:h-fit ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                <div>
                    <h3 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Filters</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Refine results by category, branch and semester.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white dark:bg-slate-700">
                        <span className="text-sm leading-none">{activeFilterCount}</span>
                        <span className="ml-1">Active</span>
                    </span>
                    {showCloseButton && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-300 bg-white p-1 text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            aria-label="Close filters"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Matching Items</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{resultCount}</p>
            </div>

            <div className={`mt-5 space-y-4 ${showApplyButton ? 'pb-24' : ''}`}>
            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Sort Results</h4>
                <select 
                    value={sortMethod}
                    onChange={(e) => onSortChange(e.target.value)}
                    className={FILTER_SELECT_STYLE}
                >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Average Rating</option>
                    <option value="newest">Newest First</option>
                </select>
            </div>

            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Branch</h4>
                <select 
                    value={selectedBranch}
                    onChange={(e) => onBranchChange(e.target.value)}
                    className={FILTER_SELECT_STYLE}
                >
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>

            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Semester</h4>
                <select 
                    value={selectedSemester}
                    onChange={(e) => onSemesterChange(e.target.value)}
                    className={FILTER_SELECT_STYLE}
                >
                    <option value="All">All Semesters</option>
                    {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Category</h4>
                <select
                    value={selectedCategory}
                    onChange={(e) => onSelectCategory(e.target.value)}
                    className={FILTER_SELECT_STYLE}
                >
                    <option value="All">All</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category === 'Prime Exclusive' ? 'Prime Exclusive ✨' : category}
                        </option>
                    ))}
                </select>
                {/* Optional helper note when Prime Exclusive selected but user isn't Prime */}
                {selectedCategory === 'Prime Exclusive' && !isPrimeMember && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                        Join Prime to access this category.
                    </p>
                )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/30 dark:bg-amber-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Campus Prime</p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">Prime members unlock exclusive listings and faster delivery slots.</p>
            </div>
            </div>

            {showApplyButton ? (
                <div className="sticky bottom-0 -mx-5 mt-4 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onResetFilters}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                        >
                            Reset
                        </button>

                        <button
                            type="button"
                            onClick={onApply}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-900 dark:hover:bg-amber-300"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onResetFilters}
                    className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                >
                    Reset Filters
                </button>
            )}
        </aside>
    );
};

const NoResultsFound = ({ onExploreAll }) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mcm-display text-3xl font-bold text-slate-800 dark:text-white">No Results Found</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-400">No listings match these filters right now. Try changing your branch, category or search text.</p>
            <button onClick={onExploreAll} className="mt-6 rounded-full bg-amber-400 px-6 py-2 font-semibold text-slate-900 shadow hover:bg-amber-500">
                Explore All Items
            </button>
        </div>
    );
};

const MarketplaceResultsSkeleton = ({ count = 8 }) => {
    const safeCount = Math.max(4, count);

    return (
        <section className="rounded-[24px] border border-slate-200/90 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
            <div className="mcm-skeleton-block mcm-skeleton-shimmer relative mb-4 h-8 w-44 rounded" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: safeCount }).map((_, index) => (
                    <div key={`marketplace-skeleton-${index}`} className="space-y-2">
                        <ProductCardSkeleton compact />
                        <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-4 w-24 rounded" />
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center gap-2">
                <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-8 w-16 rounded" />
                <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-8 w-10 rounded" />
                <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-8 w-10 rounded" />
                <div className="mcm-skeleton-block mcm-skeleton-shimmer relative h-8 w-16 rounded" />
            </div>
        </section>
    );
};

const Marketplace = ({ onNavigate, initialCategory, initialSearch }) => {
    const { state } = useGlobalState();
    const { items: products, status } = state.products;
    const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [sortMethod, setSortMethod] = useState('relevance');
    const [selectedBranch, setSelectedBranch] = useState('All Branches');
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const isPrimeMember = state.user?.isPrimeMember;

    const quickCategoryChips = useMemo(
        () => ['All', 'Textbooks', 'Notes', 'Lab Equipment', 'Electronics', 'Programming Tools', 'Prime Exclusive'],
        []
    );

    const categories = useMemo(() => [
        'Textbooks',
        'Notes',
        'Lab Equipment',
        'Electronics',
        'Calculators',
        'Drawing Supplies',
        'Study Guides',
        'Programming Tools',
        'Project Materials',
        'Workshop Equipment',
        'Technical Devices',
        'Reference Books',
        'Stationery',
        'Prime Exclusive'
    ], []);

    const handleProductSelect = (product) => {
        onNavigate('ProductDetail', product);
    };

    const showPrimeBanner = selectedCategory === 'Prime Exclusive' && !isPrimeMember;
    const isDataLoading = status === 'idle' || status === 'loading';

    const activeFilterCount = useMemo(() => {
        let total = 0;
        if (selectedCategory !== 'All') total += 1;
        if (selectedBranch !== 'All Branches') total += 1;
        if (selectedSemester !== 'All') total += 1;
        if (sortMethod !== 'relevance') total += 1;
        if (searchTerm.trim()) total += 1;
        return total;
    }, [selectedCategory, selectedBranch, selectedSemester, sortMethod, searchTerm]);

    const allItems = useMemo(() => {
        let result = [...products];

        if (selectedCategory === 'Prime Exclusive') {
            if (isPrimeMember) {
                result = result.filter(p => p.isPrimeExclusive);
            } else {
                result = [];
            }
        } else {
            if (selectedCategory !== 'All') {
                result = result.filter(p => p.category === selectedCategory);
            }
            if (!isPrimeMember) {
                result = result.filter(p => !p.isPrimeExclusive);
            }
        }

        if (searchTerm) result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (selectedBranch !== 'All Branches') result = result.filter(p => p.branch === selectedBranch || p.branch === 'Any');
        if (selectedSemester !== 'All') result = result.filter(p => p.semester === selectedSemester || p.semester === 'Any');

        switch (sortMethod) {
            case 'price_asc':
                result = result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
                break;
            case 'price_desc':
                result = result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
                break;
            case 'rating':
                result = result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
                break;
            case 'newest':
                result = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
                break;
        }

        return result;
    }, [products, selectedCategory, searchTerm, selectedBranch, selectedSemester, isPrimeMember, sortMethod]);

    const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const pagedItems = allItems.slice(start, start + pageSize);

    const resultsAnimationKey = useMemo(() => [
        selectedCategory,
        selectedBranch,
        selectedSemester,
        sortMethod,
        searchTerm.trim().toLowerCase(),
        pageSize,
        currentPage,
        allItems.length,
    ].join('|'), [
        selectedCategory,
        selectedBranch,
        selectedSemester,
        sortMethod,
        searchTerm,
        pageSize,
        currentPage,
        allItems.length,
    ]);

    const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

    useEffect(() => {
        setPage(1);
    }, [selectedCategory, searchTerm, selectedBranch, selectedSemester, sortMethod]);

    useEffect(() => {
        if (!isMobileFiltersOpen || typeof document === 'undefined') {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileFiltersOpen]);

    const closeMobileFilters = () => {
        setIsMobileFiltersOpen(false);
    };

    const handleMobileDrawerDragEnd = (_, info) => {
        const draggedFarEnough = info?.offset?.x > 90;
        const draggedFastEnough = info?.velocity?.x > 600;

        if (draggedFarEnough || draggedFastEnough) {
            closeMobileFilters();
        }
    };

    const handleExploreAll = () => {
        setSelectedCategory('All');
        setSearchTerm('');
        setSelectedBranch('All Branches');
        setSelectedSemester('All');
        setSortMethod('relevance');
        setPage(1);
    };

    const displayTitle = searchTerm
        ? `Results for "${searchTerm}"`
        : selectedCategory !== 'All'
            ? selectedCategory
            : 'All Products';

    return (
        <div className="relative space-y-6">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-800/20" />
                <div className="absolute right-0 top-[24rem] h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
            </div>

            <section className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#0b3b5a] p-5 text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.8)] sm:p-6">
                <div
                    className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    style={{ animation: 'mcm-banner-shimmer 4.6s linear infinite' }}
                />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-200">Campus Marketplace Event</p>
                        <h2 className="mcm-display mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">Deals curated for your college</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-100/90 sm:text-base">Find verified student listings, compare smarter, and checkout faster with marketplace-first browsing.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{allItems.length} listings</span>
                        {isPrimeMember ? (
                            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-900">Prime Active</span>
                        ) : (
                            <button
                                onClick={() => onNavigate('PrimeMembership')}
                                className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-900 transition hover:bg-amber-300"
                            >
                                Join Prime
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
                <div className="hidden xl:block">
                    <Filters
                        categories={categories}
                        selectedCategory={selectedCategory}
                        selectedBranch={selectedBranch}
                        selectedSemester={selectedSemester}
                        sortMethod={sortMethod}
                        onSelectCategory={setSelectedCategory}
                        onSortChange={setSortMethod}
                        onBranchChange={setSelectedBranch}
                        onSemesterChange={setSelectedSemester}
                        isPrimeMember={isPrimeMember}
                        activeFilterCount={activeFilterCount}
                        onResetFilters={handleExploreAll}
                        resultCount={allItems.length}
                    />
                </div>

                <main className="min-w-0 space-y-5">
                    <section className="xl:hidden rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setIsMobileFiltersOpen(true)}
                                className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                            >
                                <span className="inline-flex items-center gap-2.5">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                                            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                    <span>Filters</span>
                                </span>
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-slate-700">{activeFilterCount}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExploreAll}
                                disabled={activeFilterCount === 0}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                            >
                                Reset
                            </button>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/95 to-cyan-50/70 p-4 shadow-sm dark:border-slate-700 dark:from-slate-800/95 dark:via-slate-800/95 dark:to-slate-900 sm:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Marketplace Utility Bar</p>
                                <h1 className="mcm-display mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{displayTitle}</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Discover verified campus listings with quick filtering and clear ranking.</p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedCategory !== 'All' && (
                                        <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-700/60 dark:bg-cyan-900/30 dark:text-cyan-300">
                                            Category: {selectedCategory}
                                        </span>
                                    )}
                                    {selectedBranch !== 'All Branches' && (
                                        <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                                            Branch: {selectedBranch}
                                        </span>
                                    )}
                                    {selectedSemester !== 'All' && (
                                        <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                                            Semester: {selectedSemester}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 sm:gap-3">
                                <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                                    <span className="text-slate-500 dark:text-slate-400">Showing</span>
                                    <span className="ml-2 text-slate-900 dark:text-slate-100">{allItems.length === 0 ? '0' : `${start + 1}-${Math.min(start + pageSize, allItems.length)}`} of {allItems.length}</span>
                                </div>

                                <label className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                                    <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">View</span>
                                    <span className="relative ml-2 inline-flex items-center">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(Number(e.target.value))}
                                            className="appearance-none rounded-md border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-7 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/30"
                                            title="Items per page"
                                        >
                                            <option value={6}>6 / page</option>
                                            <option value={12}>12 / page</option>
                                            <option value={24}>24 / page</option>
                                            <option value={36}>36 / page</option>
                                        </select>
                                        <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-300" aria-hidden="true">
                                            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-2 shadow-inner shadow-slate-200/40 dark:border-slate-600 dark:bg-slate-900 dark:shadow-none sm:p-2.5">
                            <label className="relative block" aria-label="Search products">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                                    <SearchIcon />
                                </span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search products, category, or branch..."
                                    className="w-full rounded-xl border border-transparent bg-transparent py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-sm focus:border-amber-300 focus:bg-amber-50/30 focus:ring-2 focus:ring-amber-400/70 dark:text-slate-200 dark:focus:border-amber-500/50 dark:focus:bg-amber-900/10 dark:focus:ring-amber-500/30"
                                />

                                {searchTerm.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-1.5 flex items-center rounded-lg px-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                                        aria-label="Clear search"
                                    >
                                        <CloseIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </label>
                        </div>

                        {selectedCategory === 'Prime Exclusive' && isPrimeMember && (
                            <div className="mt-4 inline-flex items-center rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-900">
                                Prime Exclusive Access Enabled
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                            {quickCategoryChips.map((chip) => {
                                const selected = selectedCategory === chip;
                                return (
                                    <button
                                        key={chip}
                                        onClick={() => setSelectedCategory(chip)}
                                        className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${selected
                                            ? 'border-slate-900 bg-slate-900 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-900'
                                            : 'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300'}`}
                                    >
                                        {chip}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                {showPrimeBanner && (
                    <section className="rounded-[24px] border border-slate-700/40 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0369a1] p-6 text-white shadow-lg">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Prime Section Locked</p>
                                <h2 className="mcm-display mt-1 text-2xl font-bold">Upgrade to Prime for Exclusive Listings</h2>
                                <p className="mt-1 text-sm text-white/85">Prime members get access to limited academic bundles, premium seller inventory and faster pickup slots.</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => onNavigate('PrimeMembership')}
                                    className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-300"
                                >
                                    Upgrade Prime
                                </button>
                                <button
                                    onClick={() => setSelectedCategory('All')}
                                    className="rounded-lg border border-white/35 px-5 py-2.5 font-semibold text-white transition hover:bg-white/15"
                                >
                                    View Public Listings
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                    {isDataLoading && (
                        <MarketplaceResultsSkeleton count={Math.min(pageSize, 10)} />
                    )}

                    {status === 'failed' && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                            Reconnecting to the server. Product listings will refresh automatically in a moment.
                        </section>
                    )}

                    {status === 'succeeded' && (
                        <AnimatePresence mode="wait" initial={false}>
                            {pagedItems.length > 0 ? (
                                <motion.section
                                    key={`results-${resultsAnimationKey}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    className="rounded-[24px] border border-slate-200/90 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6"
                                >
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Product Grid</h2>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                        <span>Sorted:</span>
                                        <span className="text-slate-900 dark:text-slate-100">{sortMethod.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                    {pagedItems.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: Math.min(index, 7) * 0.03 }}
                                            className="space-y-2"
                                        >
                                            <ProductCard
                                                product={product}
                                                onProductSelect={handleProductSelect}
                                                compact
                                                styleVariant="marketplace"
                                            />
                                            <div className="flex items-center justify-between px-1">
                                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                    <AcademicCapIcon className="h-3.5 w-3.5" />
                                                    {(() => {
                                                        const sem = product.semester;
                                                        if (sem === 'All' || sem === 'Any') return 'All Semesters';
                                                        const n = Number(sem);
                                                        return Number.isNaN(n) ? `${sem}` : `Sem ${n}`;
                                                    })()}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                <div className="mt-6 flex items-center justify-start gap-2 overflow-x-auto pb-1 sm:justify-center sm:gap-3">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                    >
                        Prev
                    </button>

                    {Array.from({ length: totalPages }).slice(
                        Math.max(0, currentPage - 3),
                        Math.min(totalPages, currentPage + 2)
                    ).map((_, idx) => {
                        const pageNum = Math.max(1, currentPage - 3) + idx;
                        return (
                            <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`rounded-lg border px-3 py-1.5 text-sm ${
                                    pageNum === currentPage
                                      ? 'border-slate-900 bg-slate-900 text-white shadow-md dark:border-amber-400 dark:bg-amber-400 dark:text-slate-900'
                                      : 'border-slate-300 bg-white font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-amber-500/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                    >
                        Next
                    </button>
                </div>
                                </motion.section>
                            ) : !showPrimeBanner ? (
                                <motion.div
                                    key={`no-results-${resultsAnimationKey}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                >
                                    <NoResultsFound onExploreAll={handleExploreAll} />
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    )}
            </main>
            </div>

            <AnimatePresence>
                {isMobileFiltersOpen && (
                    <motion.div
                        className="fixed inset-0 z-[60] xl:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Marketplace filters"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.button
                            type="button"
                            aria-label="Close filter drawer"
                            onClick={closeMobileFilters}
                            className="absolute inset-0 bg-slate-900/55"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />

                        <motion.div
                            className="absolute inset-y-0 right-0 w-full max-w-sm p-3 mcm-safe-top-inset mcm-safe-right-inset mcm-safe-bottom-inset sm:mcm-safe-top-inset-lg sm:mcm-safe-right-inset-lg sm:mcm-safe-bottom-inset-lg"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                            drag="x"
                            dragDirectionLock
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.18}
                            onDragEnd={handleMobileDrawerDragEnd}
                        >
                            <div className="pointer-events-none absolute left-1/2 top-4 z-[1] -translate-x-1/2 text-center">
                                <span className="mx-auto block h-1 w-12 rounded-full bg-slate-300/90 dark:bg-slate-600/90" />
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500/90 dark:text-slate-400/90">Swipe right to close</p>
                            </div>

                            <Filters
                                categories={categories}
                                selectedCategory={selectedCategory}
                                selectedBranch={selectedBranch}
                                selectedSemester={selectedSemester}
                                sortMethod={sortMethod}
                                onSelectCategory={setSelectedCategory}
                                onSortChange={setSortMethod}
                                onBranchChange={setSelectedBranch}
                                onSemesterChange={setSelectedSemester}
                                isPrimeMember={isPrimeMember}
                                activeFilterCount={activeFilterCount}
                                onResetFilters={handleExploreAll}
                                resultCount={allItems.length}
                                className="h-full overflow-y-auto border-slate-300 pt-10 dark:border-slate-700"
                                showCloseButton
                                onClose={closeMobileFilters}
                                showApplyButton
                                onApply={closeMobileFilters}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Marketplace;
