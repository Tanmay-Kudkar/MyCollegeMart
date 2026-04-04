import { useState } from 'react';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { HeartIcon, ShoppingCartIcon } from '../UI/Icons';
import { products, wishlist as wishlistApi } from '../../utils/api';

const ProductCard = ({ product, onProductSelect, compact = false }) => {
    const { state, dispatch } = useGlobalState();
    const [isAdding, setIsAdding] = useState(false);
    const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
    const isWishlisted = state.wishlist.includes(product.id);

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
    const userIsPrime = state.user.isPrimeMember;
    const canPurchase = !isPrimeExclusive || userIsPrime;
    const stockQuantity = product?.stockQuantity == null ? null : Number(product.stockQuantity);
    const isInStock = product?.inStock !== false && (stockQuantity == null || stockQuantity > 0);

    return (
        <div
            className={`group bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm ${compact ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-100/70 dark:hover:shadow-cyan-950/20' : 'hover:-translate-y-1 hover:shadow-2xl'} transition-all duration-300 relative cursor-pointer`}
            onClick={() => onProductSelect(product)}
        >
            {isPrimeExclusive && (
                <div className="absolute top-2 right-2 z-10 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded">
                    PRIME
                </div>
            )}
            {!isInStock && (
                <div className="absolute top-2 left-12 z-10 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                    OUT OF STOCK
                </div>
            )}
            <div className={`relative w-full ${compact ? 'h-36 md:h-40' : 'h-56'} overflow-hidden`}>
                <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-slate-900/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <button
                    onClick={handleWishlistToggle}
                    disabled={isUpdatingWishlist}
                    className={`absolute top-2 left-2 rounded-full bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 ${compact ? 'p-1' : 'p-1.5'}`}
                    aria-label="Toggle Wishlist"
                >
                    <HeartIcon
                        filled={isWishlisted}
                        className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} ${isWishlisted ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'} transition-colors`}
                    />
                </button>
                {canPurchase && (
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
                <h3
                    className={`${compact ? 'text-sm' : 'text-base'} font-medium text-slate-900 dark:text-white truncate transition-colors group-hover:text-cyan-700 dark:group-hover:text-cyan-300`}
                    title={product.name}
                >
                    {product.name}
                </h3>
                <div className="flex justify-between items-center mt-1">
                    <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-indigo-600 dark:text-indigo-400 transition-colors group-hover:text-cyan-700 dark:group-hover:text-cyan-300`}>
                        ₹{Number(product.price).toFixed(2)}
                    </p>
                    {product.rating && (
                        <div className={`flex items-center bg-green-100 dark:bg-green-900/30 ${compact ? 'px-1 py-0' : 'px-1.5 py-0.5'} rounded`}>
                            <span className={`${compact ? 'text-[11px]' : 'text-sm'} ml-0.5 text-slate-700 dark:text-slate-300`}>
                                ★ {product.rating}
                            </span>
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
            </div>
        </div>
    );
};

export default ProductCard;
