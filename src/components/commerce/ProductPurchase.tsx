"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { products, type Product } from "@/data/products";
import { formatPrice } from "@/lib/commerce";
import { EditorialReveal } from "@/components/ui/EditorialReveal";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Quantity } from "./Quantity";
import { useCart } from "./useCart";

export function ProductPurchase({ product }: { product: Product }) {
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    const cart = useCart();
    const router = useRouter();
    const options = products.filter((item) => item.category === product.category).map((item) => ({ value: item.slug, label: `${item.sizeLabel} · ${formatPrice(item.priceVnd)}` }));
    const add = () => {
        cart.add(product.slug, quantity);
        setAdded(true);
    };
    return (
        <>
            <section className="relative px-page pb-10 pt-28 md:pt-32" style={{ backgroundColor: product.accent }}>
                <div className="mx-auto grid w-full max-w-[96rem] grid-cols-1 items-center gap-8 md:grid-cols-[1fr_minmax(18rem,0.9fr)_1fr]">
                    <div className="z-10 flex h-full flex-col justify-between py-4 md:py-10">
                        <EditorialReveal>
                            <div>
                                <span data-reveal="block" className="inline-block bg-background px-1.5 py-0.5 text-xs uppercase">
                                    {product.category}
                                </span>
                                <h1 data-reveal="words" data-reveal-at="0.15" className="mt-4 max-w-xl font-cormorant text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
                                    {product.name}
                                </h1>
                            </div>
                        </EditorialReveal>
                        <div className="mt-8 max-w-sm">
                            <EditorialReveal>
                                <p data-reveal="lines" className="text-base leading-snug md:text-lg">
                                    {product.tagline}
                                </p>
                            </EditorialReveal>
                            <div className="mt-10">
                                <p className="mb-3 text-xs uppercase tracking-wider">Khối lượng</p>
                                <Dropdown label="Chọn khối lượng" value={product.slug} options={options} onChange={(slug) => router.push(`/san-pham/${slug}/`)} />
                            </div>
                        </div>
                    </div>
                    <div data-product-media className="relative order-first mx-auto flex aspect-4/5 w-full max-w-lg items-center justify-center md:order-none">
                        <Image
                            src={product.image}
                            alt={product.name}
                            width={1200}
                            height={1200}
                            priority
                            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_2rem_2rem_rgba(0,0,0,0.18)]"
                        />
                    </div>
                    <div className="z-10 flex h-full items-end justify-end py-4 md:py-10">
                        <div className="w-full max-w-sm">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <span className="text-sm">Số lượng</span>
                                <Quantity
                                    value={quantity}
                                    onChange={(next) => {
                                        setQuantity(next);
                                        setAdded(false);
                                    }}
                                />
                            </div>
                            <Button fullWidth onClick={add}>
                                <span>Thêm vào giỏ hàng</span>
                                <span>{formatPrice(product.priceVnd * quantity)}</span>
                            </Button>
                            <p className="mt-3 text-sm">Miễn phí giao hàng cho đơn từ 500.000đ</p>
                            <p role="status" className="mt-3 min-h-6 text-sm">
                                {added && (
                                    <>
                                        Đã thêm vào giỏ.{" "}
                                        <Link href="/gio-hang/" className="underline underline-offset-4">
                                            Xem giỏ hàng ↗
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <div className="sticky top-[calc(100dvh-5rem)] z-10 flex min-h-20 items-center justify-between gap-4 border-t border-foreground/15 bg-background px-page py-3 shadow-[0_-8px_25px_rgba(37,31,24,0.08)]">
                <div className="flex items-center gap-3">
                    <Image src={product.image} alt="" width={44} height={44} className="h-11 w-11 object-contain" />
                    <span className="hidden text-sm sm:inline">
                        {product.name} · {product.sizeLabel}
                    </span>
                </div>
                <Button onClick={add}>Thêm vào giỏ hàng</Button>
            </div>
        </>
    );
}
