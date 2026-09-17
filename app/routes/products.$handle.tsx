import { Link, useLoaderData, useFetcher, useNavigate, type MetaFunction, type LoaderFunctionArgs } from "react-router";
import { useState, useEffect } from "react";
import {
    PRODUCT_BY_HANDLE_QUERY,
    RECOMMENDED_PRODUCTS_QUERY,
} from "~/graphql/StorefrontQueries";
import type {
    ProductDetailItem,
    ProductCardItem,
    ProductVariantNode,
} from "~/types/storefront.types";
import { Breadcrumb } from "~/components/ui/Breadcrumb";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Accordion } from "~/components/ui/Accordion";
import { ProductGrid } from "~/components/products/ProductGrid";
import {
    Minus,
    Plus,
    ShoppingBag,
    ShieldCheck,
    Truck,
    RotateCcw,
    Zap,
    ZoomIn,
    X,
} from "lucide-react";
import { clsx } from "clsx";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data?.product) {
        return [{ title: "Product Not Found | MONTS" }];
    }
    return [
        { title: `${data.product.title} | MONTS` },
        {
            name: "description",
            content:
                data.product.description ||
                `Handcrafted ${data.product.title} by MONTS artisans.`,
        },
        { property: "og:image", content: data.product.featuredImage?.url },
        { property: "og:type", content: "product" },
    ];
};

import { getHydrogenContext } from '~/lib/context.server';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
    const { handle } = params;
    const { storefront } = await getHydrogenContext(context, request);
    const url = new URL(request.url);
    const canonicalUrl = `${url.protocol}//${url.host}${url.pathname}`;

    if (!handle) {
        throw new Response("Product handle is required", { status: 400 });
    }

    let product: ProductDetailItem | null = null;
    let recommendedProducts: ProductCardItem[] = [];

    try {
        const data = await storefront.query(PRODUCT_BY_HANDLE_QUERY, {
            variables: { handle },
            cache: storefront.CacheShort(),
        });
        product = data?.product;

        if (product?.id) {
            try {
                const recData = await storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
                    variables: { productId: product.id },
                    cache: storefront.CacheShort(),
                });
                recommendedProducts = (recData?.productRecommendations ||
                    []) as ProductCardItem[];
            } catch (recError) {
                console.warn("Product recommendations non-critical fetch error:", recError);
            }
        }
    } catch (error) {
        console.error("Product detail query error:", error);
    }

    if (!product) {
        throw new Response("Product Not Found", { status: 404 });
    }

    return {
        product,
        recommendedProducts,
        canonicalUrl,
    };
}

export default function ProductDetailRoute() {
    const { product, recommendedProducts, canonicalUrl } =
        useLoaderData<typeof loader>();

    const navigate = useNavigate();
    const variants = product.variants?.nodes || [];
    const [selectedVariant, setSelectedVariant] = useState<ProductVariantNode>(
        variants[0] || ({} as ProductVariantNode),
    );
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [isBuyingNow, setIsBuyingNow] = useState(false);

    const cartFetcher = useFetcher<{ cart?: { checkoutUrl?: string; id?: string; totalQuantity?: number }; error?: string }>();
    const isSubmitting = cartFetcher.state !== "idle";
    const isPending = isSubmitting || addingToCart || isBuyingNow;

    useEffect(() => {
        if (cartFetcher.state === "idle") {
            if (cartFetcher.data) {
                if (cartFetcher.data.error) {
                    console.error("Cart error:", cartFetcher.data.error);
                    setAddingToCart(false);
                    setIsBuyingNow(false);
                } else if (isBuyingNow) {
                    setIsBuyingNow(false);
                    navigate("/checkout");
                } else if (addingToCart) {
                    setAddingToCart(false);
                    navigate("/cart");
                }
            } else if (addingToCart || isBuyingNow) {
                setAddingToCart(false);
                setIsBuyingNow(false);
            }
        }
    }, [cartFetcher.state, cartFetcher.data, isBuyingNow, addingToCart, navigate]);

    useEffect(() => {
        if (!isImageZoomed) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsImageZoomed(false);
            }
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [isImageZoomed]);

    const images = (product.media?.nodes
        ?.map((m) => m.image?.url)
        .filter(Boolean) as string[]) || [product.featuredImage?.url || ""];
    if (images.length === 0 && product.featuredImage?.url) {
        images.push(product.featuredImage.url);
    }

    const price = selectedVariant?.price || product.priceRange.minVariantPrice;
    const compareAtPrice =
        selectedVariant?.compareAtPrice ||
        product.compareAtPriceRange?.minVariantPrice;
    const isOnSale =
        compareAtPrice &&
        parseFloat(compareAtPrice.amount) > parseFloat(price.amount);
    const isAvailable = selectedVariant?.availableForSale ?? true;
    const primaryCollection = product.collections?.nodes?.[0];
    const taggedCollectionHandle = product.tags
        ?.find((tag) => tag.startsWith("category:"))
        ?.slice("category:".length);
    const browseCollectionHandle = primaryCollection?.handle || taggedCollectionHandle;
    const browseCollectionTitle = primaryCollection?.title || taggedCollectionHandle
        ?.split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    const browseCollectionUrl = browseCollectionHandle
        ? `/collections/${browseCollectionHandle}`
        : "/collections/all";

    const formatPrice = (amount: string, currency: string) => {
        const numeric = parseFloat(amount);
        if (isNaN(numeric)) return `${currency} ${amount}`;
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 0,
        }).format(numeric);
    };

    const handleAddToCart = () => {
        if (!selectedVariant?.id || !isAvailable || isSubmitting) return;
        setAddingToCart(true);

        const formData = new FormData();
        formData.append(
            "cartFormInput",
            JSON.stringify({
                action: "LinesAdd",
                inputs: {
                    lines: [
                        {
                            merchandiseId: selectedVariant.id,
                            quantity,
                        },
                    ],
                },
            }),
        );

        cartFetcher.submit(formData, { method: "POST", action: "/cart" });
    };

    const handleBuyNow = () => {
        if (!selectedVariant?.id || !isAvailable || isSubmitting) return;
        setIsBuyingNow(true);

        const formData = new FormData();
        formData.append(
            "cartFormInput",
            JSON.stringify({
                action: "LinesAdd",
                inputs: {
                    lines: [
                        {
                            merchandiseId: selectedVariant.id,
                            quantity,
                        },
                    ],
                },
            }),
        );

        cartFetcher.submit(formData, { method: "POST", action: "/cart" });
    };

    const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description,
        image: images,
        brand: {
            "@type": "Brand",
            name: product.vendor || "MONTS",
        },
        url: canonicalUrl,
        offers: {
            "@type": "Offer",
            price: price.amount,
            priceCurrency: price.currencyCode,
            availability: isAvailable
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: canonicalUrl,
        },
    };

    const accordionTabs = [
        {
            id: "description",
            title: "Artisanal Craft & Details",
            content: (
                <div
                    dangerouslySetInnerHTML={{
                        __html:
                            product.descriptionHtml ||
                            product.description ||
                            "<p>Meticulously handcrafted in limited artisanal batches using premium natural fibers.</p>",
                    }}
                />
            ),
        },
        {
            id: "care",
            title: "Materials & Care Guide",
            content: (
                <p>
                    100% premium long-staple cotton / linen. Dry clean
                    recommended for first wash or gentle cold hand wash with
                    pH-neutral detergent. Line dry in shade to maintain textile
                    vitality.
                </p>
            ),
        },
    ];

    return (
        <div className='max-w-[1400px] mx-auto px-6 md:px-12 pt-5 pb-28 md:pb-16'>
            {/* Product JSON-LD */}
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(productJsonLd),
                }}
            />

            <Breadcrumb
                items={[
                    { label: "Shop", href: "/collections/all" },
                    { label: product.title },
                ]}
                className='mb-4'
            />

            {/* ─── MAIN PDP GRID ─── */}
            <div className='grid grid-cols-1 lg:grid-cols-12 items-start gap-8 lg:gap-8 pb-6 border-b border-[#e8e4df]'>
                {/* Compact square media gallery */}
                <div className='lg:col-span-7 flex flex-col-reverse md:flex-row items-start gap-4 w-full max-w-[720px]'>
                    {images.length > 1 && (
                        <div className='flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[540px] shrink-0'>
                            {images.map((imgUrl, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setSelectedImageIndex(i);
                                        setIsImageZoomed(false);
                                    }}
                                    className={clsx(
                                        "w-16 h-16 sm:w-20 sm:h-20 rounded-[2px] overflow-hidden border transition-all shrink-0 cursor-pointer bg-[#f5f0e8]",
                                        selectedImageIndex === i
                                            ? "border-[#c4622d] ring-1 ring-[#c4622d]"
                                            : "border-[#e8e4df] opacity-70 hover:opacity-100",
                                    )}>
                                    <img
                                        src={imgUrl}
                                        alt={`${product.title} view ${i + 1}`}
                                        className='w-full h-full object-cover'
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    <div
                        className={clsx(
                            "group relative w-full md:flex-1 md:min-w-0 max-w-[620px] aspect-square bg-[#f5f0e8] rounded-[2px] overflow-hidden border border-[#e8e4df]/60 select-none",
                            "cursor-zoom-in",
                        )}
                        role='button'
                        tabIndex={0}
                        aria-label='Open product image viewer'
                        onClick={() => setIsImageZoomed(true)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setIsImageZoomed(true);
                            }
                        }}>
                        <img
                            src={
                                images[selectedImageIndex] ||
                                product.featuredImage?.url
                            }
                            alt={product.title}
                            draggable={false}
                            className='w-full h-full object-contain object-center'
                        />
                        <div className='absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-[#3f3027] shadow-sm backdrop-blur-sm pointer-events-none'>
                            <ZoomIn size={16} />
                            <span className='hidden sm:inline'>
                                Click to zoom
                            </span>
                        </div>
                        {isOnSale && (
                            <div className='absolute top-4 left-4 z-10'>
                                <Badge variant='sale'>Sale</Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Purchase details */}
                <div
                    className='lg:col-span-5 self-stretch flex flex-col gap-4 min-w-0'
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <div>
                        {product.vendor && (
                            <span className='text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-1.5'>
                                {product.vendor}
                            </span>
                        )}
                        <h1
                            className='text-xl sm:text-2xl md:text-3xl font-bold text-[#060505] leading-tight'
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            {product.title}
                        </h1>
                        {product.dimensions?.value ? (
                            <p className='mt-2 truncate text-sm text-[#686764]' title={product.dimensions.value}>
                                <span className='font-semibold text-[#3f3027]'>Dimensions:</span>{" "}
                                {product.dimensions.value}
                            </p>
                        ) : null}

                        {/* Price Header */}
                        <div className='flex items-center gap-3 mt-2'>
                            <span className='text-xl font-bold text-[#2c2c2c]'>
                                {formatPrice(price.amount, price.currencyCode)}
                            </span>
                            {isOnSale && compareAtPrice && (
                                <span className='text-base line-through text-[#686764]'>
                                    {formatPrice(
                                        compareAtPrice.amount,
                                        compareAtPrice.currencyCode,
                                    )}
                                </span>
                            )}
                        </div>
                        <span className='text-xs text-[#686764] block mt-1'>
                            Taxes included. Handcrafted in limited batches.
                        </span>

                        {/* Prepaid 15% Instant Savings Callout */}
                        <div className='mt-2 px-3 py-2 bg-[#faf8f5] border border-[#c4622d]/30 rounded-[6px] flex items-center justify-between gap-3'>
                            <div className='flex items-center gap-2.5'>
                                <span className='flex items-center justify-center w-6 h-6 rounded-full bg-[#c4622d] text-white text-[11px] font-bold shrink-0'>
                                    %
                                </span>
                                <div className='flex flex-col'>
                                    <span className='text-xs font-bold text-[#060505]'>
                                        Extra 15% Instant Discount
                                    </span>
                                    <span className='text-[11px] text-[#686764]'>
                                        Auto-applied at checkout on all Prepaid orders (UPI / Cards)
                                    </span>
                                </div>
                            </div>
                            <span className='text-xs font-bold text-[#c4622d] whitespace-nowrap'>
                                Save {formatPrice((parseFloat(price.amount) * 0.15).toFixed(0), price.currencyCode)}
                            </span>
                        </div>
                    </div>

                    {/* Variant Selector */}
                    {product.options &&
                        product.options.length > 0 &&
                        product.options[0].values.length > 1 && (
                            <div className='flex flex-col gap-4 pt-2 border-t border-[#e8e4df]'>
                                {product.options.map((option) => (
                                    <div
                                        key={option.name}
                                        className='flex flex-col gap-2'>
                                        <span className='text-xs font-semibold text-[#060505]'>
                                            {option.name}:{" "}
                                            <span className='font-normal text-[#686764]'>
                                                {selectedVariant?.title}
                                            </span>
                                        </span>
                                        <div className='flex flex-wrap gap-2'>
                                            {variants.map((v) => {
                                                const isSelected =
                                                    v.id ===
                                                    selectedVariant?.id;
                                                return (
                                                    <button
                                                        key={v.id}
                                                        onClick={() =>
                                                            setSelectedVariant(
                                                                v,
                                                            )
                                                        }
                                                        disabled={
                                                            !v.availableForSale
                                                        }
                                                        className={clsx(
                                                            "px-4 py-2 text-xs font-medium rounded-[4px] border transition-all cursor-pointer",
                                                            isSelected
                                                                ? "border-[#c4622d] bg-[#c4622d] text-white"
                                                                : "border-[#e8e4df] bg-[#faf8f5] text-[#2c2c2c] hover:border-[#c4622d]",
                                                            !v.availableForSale &&
                                                                "opacity-40 line-through cursor-not-allowed",
                                                        )}>
                                                        {v.title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    {/* Quantity & Actions */}
                    <div className='pt-1'>
                        {isAvailable ? (
                        <div className='hidden md:grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3'>
                            <div className='flex items-center border border-[#e8e4df] rounded-[6px] bg-[#faf8f5]' aria-label='Quantity selector'>
                                <button
                                    type='button'
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className='p-2.5 text-[#686764] hover:text-[#060505] cursor-pointer'
                                    aria-label='Decrease quantity'>
                                    <Minus className='w-3.5 h-3.5' />
                                </button>
                                <span className='px-2 text-sm font-semibold text-[#060505] min-w-[30px] text-center'>
                                    {quantity}
                                </span>
                                <button
                                    type='button'
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className='p-2.5 text-[#686764] hover:text-[#060505] cursor-pointer'
                                    aria-label='Increase quantity'>
                                    <Plus className='w-3.5 h-3.5' />
                                </button>
                            </div>
                            <Button
                                variant='outline'
                                size='lg'
                                className='w-full text-sm font-semibold gap-2 border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white h-10'
                                onClick={handleAddToCart}
                                disabled={isPending}
                                isLoading={addingToCart && isPending}>
                                <ShoppingBag className='w-4 h-4' />
                                {addingToCart ? "Adding..." : "Add to Bag"}
                            </Button>
                            <Button
                                variant='primary'
                                size='lg'
                                className='w-full text-sm font-semibold gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-sm h-10'
                                onClick={handleBuyNow}
                                disabled={isPending}
                                isLoading={isBuyingNow && isPending}>
                                <Zap className='w-4 h-4 fill-current' />
                                <span>{isBuyingNow ? "Preparing..." : "Buy Now"}</span>
                            </Button>
                        </div>
                        ) : (
                            <div className='hidden md:grid grid-cols-2 gap-3'>
                                <Link
                                    to={browseCollectionUrl}
                                    className='flex h-10 items-center justify-center rounded-[6px] border border-[#1a1a1a] px-4 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white'>
                                    Browse other {browseCollectionTitle || "products"}
                                </Link>
                                <Button size='lg' className='w-full h-10 text-sm font-semibold' disabled>
                                    Sold Out
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Flipkart-Style Mobile Fixed Bottom Action Bar */}
                    <div className='md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#e8e4df] p-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center gap-3'>
                        {isAvailable ? <>
                        <div className='flex items-center border border-[#e8e4df] rounded-[6px] bg-white'>
                            <button type='button' onClick={() => setQuantity((q) => Math.max(1, q - 1))} className='p-2' aria-label='Decrease quantity'><Minus className='w-3.5 h-3.5' /></button>
                            <span className='min-w-6 text-center text-xs font-semibold'>{quantity}</span>
                            <button type='button' onClick={() => setQuantity((q) => q + 1)} className='p-2' aria-label='Increase quantity'><Plus className='w-3.5 h-3.5' /></button>
                        </div>
                        <Button
                            variant='outline'
                            size='lg'
                            className='flex-1 text-sm font-semibold flex items-center justify-center gap-2 border-[#1a1a1a] text-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors h-12'
                            onClick={handleAddToCart}
                            disabled={isPending}
                            isLoading={addingToCart && isPending}>
                            <ShoppingBag className='w-4 h-4' />
                            {addingToCart ? "Adding..." : "Add to Bag"}
                        </Button>

                        <Button
                                variant='primary'
                                size='lg'
                                className='flex-1 text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-sm h-12'
                                onClick={handleBuyNow}
                                disabled={isPending}
                                isLoading={isBuyingNow && isPending}>
                                <Zap className='w-4 h-4 fill-current' />
                                <span>{isBuyingNow ? "Preparing..." : "Buy Now"}</span>
                        </Button>
                        </> : (
                            <>
                                <Link to={browseCollectionUrl} className='flex-1 h-12 flex items-center justify-center rounded-[6px] border border-[#1a1a1a] bg-white px-3 text-xs font-semibold text-[#1a1a1a]'>
                                    Browse {browseCollectionTitle || "products"}
                                </Link>
                                <Button size='lg' className='flex-1 h-12 text-sm font-semibold' disabled>
                                    Sold Out
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Product information tabs */}
                    <Accordion
                        items={accordionTabs}
                        variant='tabs'
                    />

                    {/* Trust Guarantees */}
                    <div className='grid grid-cols-3 gap-2 py-4 border-y border-[#e8e4df] text-center text-[11px] text-[#686764]'>
                        <div className='flex flex-col items-center gap-1'>
                            <ShieldCheck className='w-4 h-4 text-[#8b7355]' />
                            <span>Authentic Craft</span>
                        </div>
                        <div className='flex flex-col items-center gap-1'>
                            <Truck className='w-4 h-4 text-[#8b7355]' />
                            <span>Fast Dispatch</span>
                        </div>
                        <div className='flex flex-col items-center gap-1'>
                            <RotateCcw className='w-4 h-4 text-[#8b7355]' />
                            <span>30-Day Returns</span>
                        </div>
                    </div>

                    {/* Always-visible shipping information */}
                    <section className='border-b border-[#e8e4df] pb-3 text-xs leading-relaxed text-[#686764] lg:mt-auto'>
                        <h2 className='mb-2 text-sm font-semibold text-[#060505]'>
                            Shipping & Global Delivery Policy
                        </h2>
                        <div className='grid gap-1.5'>
                            <p><strong className='text-[#3f3027]'>India:</strong> Free shipping on prepaid and COD orders. Dispatch within 24–48 hours.</p>
                            <p><strong className='text-[#3f3027]'>Worldwide:</strong> Express delivery charged at actuals based on weight and destination.</p>
                            <p><strong className='text-[#3f3027]'>Prepaid:</strong> Extra 15% discount applied at checkout.</p>
                        </div>
                    </section>
                </div>
            </div>

            {isImageZoomed ? (
                <div
                    className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-[2px]'
                    role='dialog'
                    aria-modal='true'
                    aria-label={`${product.title} image viewer`}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsImageZoomed(false);
                        }
                    }}>
                    <div className='relative flex h-[92vh] w-full max-w-[1400px] overflow-hidden rounded-lg bg-[#f7f3ec] shadow-2xl'>
                        {images.length > 1 ? (
                            <div className='hidden sm:flex w-24 shrink-0 flex-col gap-3 overflow-y-auto border-r border-[#e8e4df] p-3'>
                                {images.map((imageUrl, index) => (
                                    <button
                                        key={imageUrl}
                                        type='button'
                                        onClick={() => {
                                            setSelectedImageIndex(index);
                                        }}
                                        className={clsx(
                                            'aspect-square overflow-hidden rounded border bg-white',
                                            selectedImageIndex === index ? 'border-[#c4622d] ring-1 ring-[#c4622d]' : 'border-[#d8d1c7]',
                                        )}>
                                        <img src={imageUrl} alt={`${product.title} view ${index + 1}`} className='h-full w-full object-cover' />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        <div className='flex-1 overflow-auto p-4'>
                            <img
                                src={images[selectedImageIndex] || product.featuredImage?.url}
                                alt={product.title}
                                draggable={false}
                                className='mx-auto block max-h-none max-w-none select-none'
                            />
                        </div>
                        <button
                            type='button'
                            onClick={() => {
                                setIsImageZoomed(false);
                            }}
                            className='absolute right-4 top-4 rounded-full bg-white/95 p-2 text-[#1a1a1a] shadow-md hover:bg-white'
                            aria-label='Close image viewer'>
                            <X size={20} />
                        </button>
                    </div>
                </div>
            ) : null}

            {/* ─── RECOMMENDED PRODUCTS ROW ─── */}
            {recommendedProducts.length > 0 && (
                <div className='pt-16'>
                    <div className='text-center max-w-xl mx-auto mb-10'>
                        <span className='text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-1'>
                            Pairings & Related
                        </span>
                        <h2
                            className='text-2xl md:text-3xl font-bold text-[#060505]'
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            You May Also Love
                        </h2>
                    </div>
                    <ProductGrid products={recommendedProducts.slice(0, 4)} />
                </div>
            )}
        </div>
    );
}
