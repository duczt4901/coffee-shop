import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function HomePageVideo(): React.ReactElement {
    return (
        <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="home-page-video h-full w-full object-cover will-change-transform">
            <source src="/images/landingpage-hero.mp4" type="video/mp4" />
        </video>
    );
}

export function HeroContent(): React.ReactElement {
    return (
        <div className={cn("flex min-h-svh w-full flex-col justify-end px-8 pb-8 pt-32 text-white")}>
            <div className={cn("flex w-full flex-col items-end gap-8 text-right")}>
                <h1 className={cn("text-[clamp(3rem,7.5vw,7.5rem)] font-semibold leading-[0.88] tracking-tighter text-white/40")}>Lorem ipsum dolor sit amet, consectetur adipiscing elit</h1>
                <p className={cn("text-[clamp(3rem,7.5vw,7.5rem)] font-light leading-[0.88] tracking-tighter")} />
            </div>

            <div className={cn("items-start")}>
                <p className={cn("max-w-md text-sm font-medium sm:text-base")}>Lorem ipsum dolor sit amet, consectetur adipiscing elit,</p>
            </div>
        </div>
    );
}

export function ProductSection() {
    return (
        <section className="px-page font-cormorant flex flex-col md:pb-[20svh]">

            <header className="flex min-h-[72svh] flex-col items-center justify-center px-3 py-24 text-center md:min-h-[92svh] md:px-6">
                <p className="mb-8 text-[clamp(0.8rem,1vw,1rem)] italic">Bầu ơi thương lấy bí cùng</p>
                <h2 id="process-gallery-title" className="text-[clamp(3.75rem,8.5vw,10rem)] font-medium uppercase leading-none tracking-[-0.06em]">
                    <em className="font-normal lowercase">tuy rằng</em> khác giống
                    <br />
                    <em className="font-normal lowercase">nhưng</em> chung một giàn
                </h2>
            </header>

            <div className="flex flex-col items-center gap-20">
                <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                    {products.map((product, index) => (
                        <article key={product.id} className="group">
                            {/* Product image */}
                            <div className="relative flex aspect-4/5 items-center justify-center overflow-hidden bg-[#ede8dd]">
                                <Image
                                    src={`/images/product/coffee${index+1}.png`}
                                    alt="Product"
                                    width={800}
                                    height={1000}
                                    className="h-auto w-2/3 object-contain transition-transform duration-120 group-hover:scale-[1.02]"
                                />

                                {product.badge && <span className="absolute bottom-4 left-4 bg-[#b64d4e] px-1.5 py-0.5 text-xs font-medium uppercase leading-none text-white">{product.badge}</span>}
                            </div>
                            {/* Product info */}
                            <div className="pt-7">
                                <h3 className="text-xs text-[clamp(1rem,1.2vw,1.2rem)] leading-tight tracking-[-0.02em] text-neutral-800 font-semibold">
                                    {product.name} {product.sizeLabel}
                                </h3>

                                <p className="mt-1 text-[clamp(1rem,1.2vw,1.2rem)] text-neutral-400">{product.price}</p>
                            </div>
                        </article>
                    ))}
                </div>
                <p className="bg-white px-12 py-[0.9rem] text-[clamp(0.9rem,1.15vw,1.1rem)] uppercase">
                    Xem thêm
                </p>
            </div>
        </section>
    );
}



const products = [
    {
        id: 1,
        name: "TrungToan Coffee Robusta",
        sizeLabel: "200 g",
        price: "119.000 vnđ",
    },
    {
        id: 2,
        name: "TrungToan Coffee Arabica",
        sizeLabel: "200 g",
        price: "119.000 vnđ",
    },
    {
        id: 3,
        name: "TrungToan Coffee Robusta Large Pack",
        sizeLabel: "500g",
        price: "219.000 vnđ",
        badge: "BEST SELLER",
    },
    {
        id: 4,
        name: "TrungToan Coffee Robusta Grand Pack",
        sizeLabel: "1000 g",
        price: "389.000 vnđ",
    },
];
