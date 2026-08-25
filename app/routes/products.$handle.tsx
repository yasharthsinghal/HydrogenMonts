import { json, type LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { useLoaderData, useFetcher, useNavigate, type MetaFunction } from "@remix-run/react";
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

export async function loader({ params, request, context }: LoaderFunctionArgs) {
    const { handle } = params;
    const { storefront } = context;
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
        product = data.product;

        if (product?.id) {
            const recData = await storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
                variables: { productId: product.id },
                cache: storefront.CacheShort(),
            });
            recommendedProducts = (recData.productRecommendations ||
                []) as ProductCardItem[];
        }
    } catch (error) {
        console.error("Product detail query error:", error);
    }

    if (!product) {
        throw new Response("Product Not Found", { status: 404 });
    }

    return json({
        product,
        recommendedProducts,
        canonicalUrl,
    });
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
        {
            id: "shipping",
            title: "Shipping & Global Delivery Policy",
            content: (
                <div className="flex flex-col gap-2 text-xs text-[#686764] leading-relaxed">
                    <p>
                        <strong className="text-[#060505]">🇮🇳 Domestic (India):</strong> Complimentary <strong>Free Shipping</strong> on all domestic orders across India (both Prepaid & COD). Dispatched within 24–48 hours.
                    </p>
                    <p>
                        <strong className="text-[#060505]">✈️ Worldwide (US, UK, SG, JP, UAE):</strong> International express delivery charged strictly at actuals based on weight and destination at checkout.
                    </p>
                    <p>
                        <strong className="text-[#060505]">⚡ Prepaid Offer:</strong> Instant extra 15% discount applied at checkout on all online prepaid payments.
                    </p>
                </div>
            ),
        },
    ];

    return (
        <div className='max-w-[1400px] mx-auto px-6 md:px-12 py-10 pb-28 md:pb-16'>
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
                className='mb-8'
            />

            {/* ─── MAIN PDP GRID ─── */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pb-16 border-b border-[#e8e4df]'>
                {/* Media Gallery (7 cols) */}
                <div className='lg:col-span-7 flex flex-col-reverse md:flex-row gap-4'>
                    {images.length > 1 && (
                        <div className='flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[620px] shrink-0'>
                            {images.map((imgUrl, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedImageIndex(i)}
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
                        className='relative flex-1 bg-[#f5f0e8] rounded-[2px] overflow-hidden border border-[#e8e4df]/60'
                        style={{ aspectRatio: "1/1" }}>
                        <img
                            src={
                                images[selectedImageIndex] ||
                                product.featuredImage?.url
                            }
                            alt={product.title}
                            className='w-full h-full object-cover object-center'
                        />
                        {isOnSale && (
                            <div className='absolute top-4 left-4 z-10'>
                                <Badge variant='sale'>Sale</Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Purchase Column (5 cols) */}
                <div
                    className='lg:col-span-5 flex flex-col gap-6'
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <div>
                        {product.vendor && (
                            <span className='text-xs uppercase tracking-[0.2em] font-semibold text-[#8b7355] block mb-1.5'>
                                {product.vendor}
                            </span>
                        )}
                        <h1
                            className='text-2xl sm:text-3xl md:text-4xl font-bold text-[#060505] leading-tight'
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            {product.title}
                        </h1>

                        {/* Price Header */}
                        <div className='flex items-center gap-3 mt-3'>
                            <span className='text-2xl font-bold text-[#2c2c2c]'>
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
                        <div className='mt-3 p-3 bg-[#faf8f5] border border-[#c4622d]/30 rounded-[6px] flex items-center justify-between gap-3'>
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
                    <div className='flex flex-col gap-4 pt-2'>
                        <div className='flex items-center justify-between'>
                            <span className='text-xs font-semibold text-[#060505]'>
                                Quantity
                            </span>
                            <div className='flex items-center border border-[#e8e4df] rounded-[6px] bg-[#faf8f5]'>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setQuantity((q) => Math.max(1, q - 1))
                                    }
                                    className='p-2.5 text-[#686764] hover:text-[#060505] cursor-pointer'
                                    aria-label='Decrease quantity'>
                                    <Minus className='w-3.5 h-3.5' />
                                </button>
                                <span className='px-3 text-sm font-semibold text-[#060505] min-w-[32px] text-center'>
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
                        </div>

                        {/* Desktop 2-Column Action Buttons */}
                        <div className='hidden md:grid grid-cols-2 gap-3 pt-1'>
                            <Button
                                variant='outline'
                                size='lg'
                                className='w-full text-sm font-semibold flex items-center justify-center gap-2 border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors h-12'
                                onClick={handleAddToCart}
                                disabled={!isAvailable || isPending}
                                isLoading={addingToCart && isPending}>
                                <ShoppingBag className='w-4 h-4' />
                                {isAvailable ? (addingToCart ? "Adding..." : "Add to Bag") : "Sold Out"}
                            </Button>

                            {isAvailable && (
                                <Button
                                    variant='primary'
                                    size='lg'
                                    className='w-full text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-sm h-12'
                                    onClick={handleBuyNow}
                                    disabled={!isAvailable || isPending}
                                    isLoading={isBuyingNow && isPending}>
                                    <Zap className='w-4 h-4 fill-current' />
                                    <span>{isBuyingNow ? "Preparing..." : "Buy Now"}</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Flipkart-Style Mobile Fixed Bottom Action Bar */}
                    <div className='md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#e8e4df] p-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center gap-3'>
                        <Button
                            variant='outline'
                            size='lg'
                            className='flex-1 text-sm font-semibold flex items-center justify-center gap-2 border-[#1a1a1a] text-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors h-12'
                            onClick={handleAddToCart}
                            disabled={!isAvailable || isPending}
                            isLoading={addingToCart && isPending}>
                            <ShoppingBag className='w-4 h-4' />
                            {isAvailable ? (addingToCart ? "Adding..." : "Add to Bag") : "Sold Out"}
                        </Button>

                        {isAvailable && (
                            <Button
                                variant='primary'
                                size='lg'
                                className='flex-1 text-sm font-semibold flex items-center justify-center gap-2 bg-[#c4622d] hover:bg-[#923f12] text-white shadow-sm h-12'
                                onClick={handleBuyNow}
                                disabled={!isAvailable || isPending}
                                isLoading={isBuyingNow && isPending}>
                                <Zap className='w-4 h-4 fill-current' />
                                <span>{isBuyingNow ? "Preparing..." : "Buy Now"}</span>
                            </Button>
                        )}
                    </div>

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

                    {/* Product Accordion Info */}
                    <Accordion
                        items={accordionTabs}
                        defaultOpenId='description'
                        allowMultiple
                    />
                </div>
            </div>

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
