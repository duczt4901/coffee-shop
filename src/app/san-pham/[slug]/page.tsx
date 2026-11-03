import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { createMetadata } from "@/lib/metadata";
import { getProduct, products } from "@/data/products";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { ProductPurchase } from "@/components/commerce/ProductPurchase";

type ProductPageProps = {
    params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
    return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { slug } = await params;
    const product = getProduct(slug);

    return product
        ? createMetadata({
              title: `${product.name} | Coffee Shop`,
              description: product.tagline,
              path: `/san-pham/${product.slug}/`,
          })
        : {};
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const product = getProduct(slug);

    if (!product) notFound();

    const details = [
        ["Xuất xứ", product.origin],
        ["Sơ chế", product.process],
        ["Giống", product.varieties],
        ["Độ cao", product.altitude],
        ["Mức rang", product.roast],
    ];

    return (
        <article className="bg-background text-foreground">
            <ProductPurchase key={product.slug} product={product} />

            <section className="px-page py-20 md:py-32" aria-labelledby="product-details-title">
                <div className="mx-auto grid max-w-[96rem] gap-14 md:grid-cols-2 md:gap-20">
                    <EditorialReveal>
                        <h2 data-reveal="words" id="product-details-title" className="font-cormorant text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-none tracking-[-0.05em]">
                            Về sản phẩm
                        </h2>
                    </EditorialReveal>

                    <div>
                        <EditorialReveal>
                            <dl className="border-t border-foreground/35">
                                {details.map(([label, value], index) => (
                                    <div key={label} className="grid grid-cols-[7rem_1fr] gap-6 border-b border-foreground/25 py-4 text-sm">
                                        <dt data-reveal="lines" data-reveal-at={index * 0.1} className="uppercase text-foreground/50">
                                            {label}
                                        </dt>
                                        <dd data-reveal="lines" data-reveal-at={index * 0.1} className="text-right font-medium">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </EditorialReveal>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="flex min-h-48 flex-col justify-between bg-foreground/5 p-5">
                                <strong className="font-cormorant text-2xl">Nông hộ Lâm Đồng</strong>
                                <span className="text-sm">Đồng hành sản xuất</span>
                            </div>
                            <div className="flex min-h-48 flex-col justify-between bg-foreground/5 p-5">
                                <strong className="font-cormorant text-2xl">Thu hoạch chọn lọc</strong>
                                <span className="text-sm">Ưu tiên trái chín</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden px-page py-20 md:py-32" style={{ backgroundColor: product.accent }} aria-labelledby="product-story-title">
                <div className="mx-auto max-w-[96rem]">
                    <EditorialReveal>
                        <div className="ml-auto max-w-2xl">
                            <h2 data-reveal="words" id="product-story-title" className="font-cormorant text-[clamp(4rem,8vw,8rem)] font-semibold leading-none tracking-[-0.055em]">
                                Cao nguyên
                            </h2>
                            <p data-reveal="lines" data-reveal-at="0.25" className="mt-8 max-w-xl text-base font-medium leading-relaxed md:text-lg">
                                {product.story}
                            </p>
                            <RevealLink href="/cau-chuyen/" variant="border" className="mt-8 text-sm font-semibold uppercase">
                                Đọc câu chuyện
                            </RevealLink>
                        </div>
                    </EditorialReveal>

                    <div className="mt-20 grid gap-6 md:grid-cols-2">
                        <figure>
                            <Image src="/images/coffee/sun-dried-coffee-cherries.webp" alt="Cà phê được phơi sau thu hoạch" width={1600} height={900} className="aspect-[4/3] w-full object-cover" />
                            <figcaption className="mt-2 text-xs">Mùa thu hoạch tại cao nguyên Việt Nam</figcaption>
                        </figure>
                        <figure className="md:mt-24">
                            <Image src="/images/coffee/coffee-cherry-harvest.webp" alt="Thu hái cà phê chín" width={1600} height={900} className="aspect-[4/3] w-full object-cover" />
                            <figcaption className="mt-2 text-xs">Những trái cà phê được hái chọn lọc</figcaption>
                        </figure>
                    </div>
                </div>
            </section>
        </article>
    );
}
