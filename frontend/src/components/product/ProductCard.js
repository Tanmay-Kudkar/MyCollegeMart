import { useState } from 'react';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { HeartIcon, ShoppingCartIcon } from '../UI/Icons';
import { products, wishlist as wishlistApi } from '../../utils/api';

const ProductCard = ({ product, onProductSelect, compact = false, styleVariant = 'default' }) => {
    const { state, dispatch } = useGlobalState();
    const [isAdding, setIsAdding] = useState(false);
    const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
    const isWishlisted = state.wishlist.includes(product.id);
    const isMarketplaceCard = styleVariant === 'marketplace';

    const handleWishlistToggle = async (e) => {
        e.stopPropagation();
        if (isUpdatingWishlist) return;

        if (!state.isLoggedIn) {
            dispatch({ 
                type: actionTypes.TOGGLE_WISHLIST,
                payload: product.id 
            });
            return;
        }

        setIsUpdatingWishlist(true);
        try {
            const response = isWishlisted
                ? await wishlistApi.remove(product.id)
                : await wishlistApi.add(product.id);

            dispatch({
                type: actionTypes.SET_WISHLIST,
                payload: Array.isArray(response.data?.productIds) ? response.data.productIds : []
            });
        } catch (_) {
            dispatch({
                type: actionTypes.ADD_NOTIFICATION,
                payload: { message: 'Failed to update wishlist.', type: 'error' }
            });
        } finally {
            setIsUpdatingWishlist(false);
        }
    };

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        if (isAdding) return;
        if (product?.inStock === false || (product?.stockQuantity != null && Number(product.stockQuantity) <= 0)) {
            dispatch({
                type: actionTypes.ADD_NOTIFICATION,
                payload: { message: 'This item is currently out of stock.', type: 'error' }
            });
            return;
        }

        setIsAdding(true);
        try {
            if (!state.isLoggedIn) {
                dispatch({ type: actionTypes.ADD_TO_CART, payload: product });
                dispatch({
                    type: actionTypes.ADD_NOTIFICATION,
                    payload: { message: 'Added to cart!', type: 'success' }
                });
                return;
            }

            await products.addToCart(product.id, 1, state.user?.id || null);
            dispatch({ type: actionTypes.ADD_TO_CART, payload: product });
            dispatch({ 
                type: actionTypes.ADD_NOTIFICATION, 
                payload: { message: 'Added to cart!', type: 'success' } 
            });
        } catch (error) {
            dispatch({ 
                type: actionTypes.ADD_NOTIFICATION, 
                payload: { message: 'Failed to add item to cart.', type: 'error' } 
            });
        } finally {
            setIsAdding(false);
        }
    };

    const isPrimeExclusive = product.isPrimeExclusive;
    const userIsPrime = Boolean(state.user?.isPrimeMember);
    const canPurchase = !isPrimeExclusive || userIsPrime;
    const stockQuantity = product?.stockQuantity == null ? null : Number(product.stockQuantity);
    const isInStock = product?.inStock !== false && (stockQuantity == null || stockQuantity > 0);
    const safePrice = Number(product?.price || 0);
    const [priceMajor, priceMinor] = safePrice.toFixed(2).split('.');
    const safeRating = Number(product?.rating || 0);
    const hasRating = Number.isFinite(safeRating) && safeRating > 0;
    const shippingHint = !isInStock
        ? 'Currently unavailable'
        : isPrimeExclusive
            ? (userIsPrime ? 'Prime fast delivery available' : 'Prime membership required to buy')
            : 'Free campus delivery on eligible orders';

    return (
        <div
            className={`group relative cursor-pointer overflow-hidden border bg-white transition-all duration-300 dark:bg-slate-800 ${isMarketplaceCard
                ? 'rounded-xl border-slate-200 shadow-sm hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/80 dark:border-slate-700 dark:hover:border-amber-500/40 dark:hover:shadow-amber-900/20'
                : `rounded-lg border-slate-200 shadow-sm ${compact ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-100/70 dark:hover:shadow-cyan-950/20' : 'hover:-translate-y-1 hover:shadow-2xl'} dark:border-slate-700`}`}
            onClick={() => onProductSelect(product)}
        >
            {isPrimeExclusive && (
                <div className="absolute right-2 top-2 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-900 shadow">
                    PRIME
                </div>
            )}
            {!isInStock && (
                <div className="absolute left-12 top-2 z-10 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    OUT OF STOCK
                </div>
            )}
            <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-900 ${compact ? 'h-36 md:h-40' : 'h-56'} ${isMarketplaceCard ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}>
                <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 group-hover:opacity-100 ${isMarketplaceCard ? 'bg-gradient-to-t from-slate-900/25 via-slate-900/5 to-transparent opacity-100' : 'bg-gradient-to-t from-slate-900/35 via-slate-900/5 to-transparent opacity-0'}`} />
                <button
                    onClick={handleWishlistToggle}
                    disabled={isUpdatingWishlist}
                    className={`absolute left-2 top-2 rounded-full bg-white/90 transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 dark:bg-slate-800/90 dark:hover:bg-slate-700 ${compact ? 'p-1' : 'p-1.5'}`}
                    aria-label="Toggle Wishlist"
                >
                    <HeartIcon
                        filled={isWishlisted}
                        className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} ${isWishlisted ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'} transition-colors`}
                    />
                </button>

                {!isMarketplaceCard && canPurchase && (
                    <button
                        onClick={handleAddToCart}
                        disabled={isAdding || !isInStock}
                        className="absolute bottom-2 right-2 p-2 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-110 hover:-translate-y-0.5 disabled:bg-indigo-400 disabled:shadow-none disabled:scale-100 disabled:translate-y-0 transition-all duration-200"
                        aria-label="Add to Cart"
                    >
                        {isAdding ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <ShoppingCartIcon className="w-5 h-5" />
                        )}
                    </button>
                )}
            </div>

            <div className={compact ? 'p-3' : 'p-4'}>
                {isMarketplaceCard && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Campus Choice</p>
                )}
                <h3
                    className={`${compact ? 'text-sm' : 'text-base'} ${isMarketplaceCard ? 'line-clamp-2 min-h-[2.7rem]' : 'truncate'} font-semibold text-slate-900 transition-colors group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-300`}
                    title={product.name}
                >
                    {product.name}
                </h3>

                <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`${compact ? 'text-sm' : 'text-base'} flex items-start font-semibold text-slate-900 dark:text-white`}>
                        <span className="mr-0.5 mt-[2px] text-xs">₹</span>
                        <span className="text-xl leading-none">{priceMajor}</span>
                        <span className="mt-[2px] text-xs">.{priceMinor}</span>
                    </p>

                    {hasRating && (
                        <div className={`inline-flex items-center rounded ${compact ? 'px-1 py-0' : 'px-1.5 py-0.5'} bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`}>
                            <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold`}>★ {safeRating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <p className={`mt-1 text-[11px] font-semibold ${isInStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isInStock
                        ? stockQuantity != null
                            ? `In stock (${stockQuantity})`
                            : 'In stock'
                        : 'Out of stock'}
                </p>

                {isMarketplaceCard && (
                    <p className={`mt-1 text-[11px] ${canPurchase ? 'text-slate-600 dark:text-slate-300' : 'text-amber-600 dark:text-amber-300'}`}>
                        {shippingHint}
                    </p>
                )}

                {isMarketplaceCard && (
                    <button
                        onClick={handleAddToCart}
                        disabled={!canPurchase || isAdding || !isInStock}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-2 text-xs font-bold leading-none text-slate-900 transition hover:bg-amber-300 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                        aria-label="Add to Cart"
                    >
                        {isAdding ? (
                            <svg className="h-3.5 w-3.5 animate-spin text-slate-900 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <ShoppingCartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                        {!canPurchase ? 'Prime Required' : !isInStock ? 'Unavailable' : 'Add to Cart'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
