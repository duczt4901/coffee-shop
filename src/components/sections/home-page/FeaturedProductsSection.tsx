import React from "react";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/data/products";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";

export function FeaturedProductsSection() {
    return (
        <section className="px-page pb-section-large font-cormorant flex flex-col" aria-labelledby="product-title">
            <EditorialReveal start="center 85%">
                <header className="flex flex-col items-center justify-center px-3 py-section-large text-center md:px-6">
                    <p data-reveal="block" className="mb-8 text-[clamp(0.8rem,1vw,1rem)] italic">
                        Bầu ơi thương lấy bí cùng
                    </p>
                    <h2
                        data-reveal="words"
                        data-reveal-at="0.15"
                        id="product-title"
                        className="text-[clamp(2.75rem,14vw,3.75rem)] font-medium uppercase leading-none tracking-[-0.06em] md:text-[clamp(3.75rem,8.5vw,10rem)]"
                    >
                        <em className="font-normal lowercase">tuy rằng</em> khác giống
                        <br /> <em className="font-normal lowercase">nhưng</em> chung một giàn
                    </h2>
                </header>
            </EditorialReveal>

            <div className="flex flex-col items-center gap-20">
                <EditorialReveal start="top 90%">
                    <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => (
                            <article data-reveal="block" key={product.slug} className="group">
                                {/* Product image */}
                                <Link
                                    href={`/san-pham/${product.slug}/`}
                                    className="relative flex aspect-4/5 items-center justify-center overflow-hidden bg-[#ede8dd]"
                                    aria-label={`Xem ${product.name}`}
                                >
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        width={800}
                                        height={1000}
                                        className="h-auto w-2/3 object-contain transition-transform duration-120 group-hover:scale-[1.02]"
                                    />

                                    {product.badge && (
                                        <span className="absolute bottom-4 left-4 bg-[#b64d4e] px-1.5 py-0.5 text-xs font-medium uppercase leading-none text-white">{product.badge}</span>
                                    )}
                                </Link>
                                {/* Product info */}
                                <div data-product-details className="pt-7">
                                    <h3 className="text-xs text-[clamp(1rem,1.2vw,1.2rem)] leading-tight tracking-[-0.02em] text-neutral-800 font-semibold">
                                        <Link href={`/san-pham/${product.slug}/`}>
                                            {product.name} {product.sizeLabel}
                                        </Link>
                                    </h3>

                                    <p className="mt-1 text-[clamp(1rem,1.2vw,1.2rem)] text-neutral-400">{product.price}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </EditorialReveal>

                <RevealLink href="/san-pham/">
                    Khám phá <em>cà phê của chúng tôi</em>
                </RevealLink>
            </div>
        </section>
    );
}
