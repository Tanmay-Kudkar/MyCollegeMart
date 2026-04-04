import { useState, useEffect, useMemo } from 'react';
import { useGlobalState, actionTypes } from '../context/GlobalStateContext';
import ProductCard from '../components/product/ProductCard';
import { AcademicCapIcon } from '../components/UI/Icons';

const FALLBACK_PRODUCTS = [
    {
        id: 'demo-1',
        name: 'Engineering Mechanics Notes Bundle',
        price: 149,
        imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80',
        category: 'Notes',
        branch: 'Mechanical Engineering',
        semester: 2,
        isPrimeExclusive: false,
        rating: 4.6,
    },
    {
        id: 'demo-2',
        name: 'DSA Workbook + Previous Papers',
        price: 299,
        imageUrl: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=900&q=80',
        category: 'Textbooks',
        branch: 'Computer Engineering',
        semester: 3,
        isPrimeExclusive: false,
        rating: 4.8,
    },
    {
        id: 'demo-3',
        name: 'Basic Electronics Lab Kit',
        price: 999,
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
        category: 'Lab Equipment',
        branch: 'Electronics and Telecommunication Engineering',
        semester: 4,
        isPrimeExclusive: false,
        rating: 4.5,
    },
    {
        id: 'demo-4',
        name: 'Prime Exclusive: AI Model Training Toolkit',
        price: 2199,
        imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
        category: 'Programming Tools',
        branch: 'Artificial Intelligence and Data Science',
        semester: 7,
        isPrimeExclusive: true,
        rating: 4.9,
    },
];

const FILTER_SELECT_STYLE = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

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
    isPrimeMember
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
    
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8, 'All'];

    return (
        <aside className="w-full rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 xl:sticky xl:top-24 xl:h-fit">
            <h3 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Filters</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Narrow products by relevance, branch and semester.</p>

            <div className="mt-5 space-y-4">
            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Sort By</h4>
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
            </div>
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

const Marketplace = ({ onNavigate, initialCategory, initialSearch }) => {
    const { state, dispatch } = useGlobalState();
    const { items: products, status } = state.products;
    const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [sortMethod, setSortMethod] = useState('relevance');
    const [selectedBranch, setSelectedBranch] = useState('All Branches');
    const [selectedSemester, setSelectedSemester] = useState('All');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const isPrimeMember = state.user?.isPrimeMember;

    useEffect(() => {
        if (status === 'idle') {
            dispatch({ type: actionTypes.FETCH_PRODUCTS_START });
            // Use the products API from context/global state if available
            state.products.api.getAll()
                .then(response => {
                    dispatch({ type: actionTypes.FETCH_PRODUCTS_SUCCESS, payload: response.data });
                })
                .catch(error => {
                    const unreachable = /Failed to fetch|Network Error|ERR_CONNECTION_REFUSED/i.test(String(error));
                    if (unreachable) {
                        dispatch({ type: actionTypes.FETCH_PRODUCTS_SUCCESS, payload: FALLBACK_PRODUCTS });
                        dispatch({
                            type: actionTypes.ADD_NOTIFICATION,
                            payload: { message: 'Backend is offline. Showing demo products.', type: 'error' }
                        });
                    } else {
                        dispatch({ type: actionTypes.FETCH_PRODUCTS_FAIL, payload: error.toString() });
                    }
                });
        }
    }, [status, dispatch, state.products.api]);
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

    const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

    useEffect(() => {
        setPage(1);
    }, [selectedCategory, searchTerm, selectedBranch, selectedSemester, sortMethod]);

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
                <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
                <div className="absolute right-0 top-[24rem] h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-800/20" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
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
                />

                <main className="space-y-5">
                    <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Marketplace Utility Bar</p>
                                <h1 className="mcm-display mt-1 text-3xl font-bold text-slate-900 dark:text-white">{displayTitle}</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Discover verified campus listings with fast filters and clear sorting.</p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <div className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    {allItems.length === 0 ? '0' : `${start + 1}-${Math.min(start + pageSize, allItems.length)}`} of {allItems.length}
                                </div>

                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className={`${FILTER_SELECT_STYLE} sm:w-auto sm:min-w-[9rem]`}
                                    title="Items per page"
                                >
                                    <option value={12}>12 / page</option>
                                    <option value={24}>24 / page</option>
                                    <option value={36}>36 / page</option>
                                </select>

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search products..."
                                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 sm:flex-1 sm:min-w-[16rem] sm:w-auto lg:w-72"
                                />
                            </div>
                        </div>

                        {selectedCategory === 'Prime Exclusive' && isPrimeMember && (
                            <div className="mt-4 inline-flex items-center rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-900">
                                Prime Exclusive Access Enabled
                            </div>
                        )}
                    </section>

                {showPrimeBanner && (
                    <section className="rounded-[24px] border border-indigo-300/50 bg-gradient-to-br from-indigo-950 via-indigo-800 to-cyan-700 p-6 text-white shadow-lg">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-100">Prime Section Locked</p>
                                <h2 className="mcm-display mt-1 text-2xl font-bold">Upgrade to Prime for Exclusive Listings</h2>
                                <p className="mt-1 text-sm text-white/85">Prime members get access to limited academic bundles, premium seller inventory and faster pickup slots.</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => onNavigate('PrimeMembership')}
                                    className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-500"
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

                    {status === 'loading' && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Loading marketplace listings...
                        </section>
                    )}

                    {status === 'failed' && (
                        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm dark:border-rose-800/40 dark:bg-rose-900/10 dark:text-rose-300">
                            Error loading products. Please refresh and try again.
                        </section>
                    )}

                    {status === 'succeeded' && (
                        pagedItems.length > 0 ? (
                            <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
                                <h2 className="mcm-display mb-4 text-2xl font-bold text-slate-900 dark:text-white">Product Grid</h2>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                                    {pagedItems.map((product) => (
                                        <div key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/70 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-cyan-950/20">
                                            <ProductCard
                                                product={product}
                                                onProductSelect={handleProductSelect}
                                                compact
                                            />
                                            <div className="-mt-1 flex items-center justify-between border-t border-slate-200/70 bg-white px-3 py-1.5 transition-colors duration-300 group-hover:bg-cyan-50/70 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:bg-slate-800">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 transition-all duration-300 group-hover:-translate-y-px group-hover:bg-cyan-100 group-hover:text-cyan-800 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-cyan-900/30 dark:group-hover:text-cyan-200">
                                                    <AcademicCapIcon className="h-3.5 w-3.5" />
                                                    {(() => {
                                                        const sem = product.semester;
                                                        if (sem === 'All' || sem === 'Any') return 'All Semesters';
                                                        const n = Number(sem);
                                                        return Number.isNaN(n) ? `${sem}` : `Sem ${n}`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:hover:border-cyan-700 dark:hover:bg-slate-900 dark:hover:text-cyan-300"
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
                                      ? 'border-cyan-600 bg-cyan-600 text-white shadow-md shadow-cyan-500/40'
                                      : 'border-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-600 dark:hover:border-cyan-700 dark:hover:bg-slate-900 dark:hover:text-cyan-300'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:hover:border-cyan-700 dark:hover:bg-slate-900 dark:hover:text-cyan-300"
                    >
                        Next
                    </button>
                </div>
                            </section>
                        ) : !showPrimeBanner ? (
                            <NoResultsFound onExploreAll={handleExploreAll} />
                        ) : null
                    )}
            </main>
            </div>
        </div>
    );
};

export default Marketplace;
