import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { createMetadata } from "@/lib/metadata";
import { getProduct, products } from "@/data/products";

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
            <section className="relative min-h-svh overflow-hidden px-page pb-10 pt-28 md:pt-32" style={{ backgroundColor: product.accent }}>
                <div className="mx-auto grid min-h-[calc(100svh-10rem)] w-full max-w-[96rem] grid-cols-1 items-center gap-8 md:grid-cols-[1fr_minmax(18rem,0.9fr)_1fr]">
                    <div className="z-10 flex h-full flex-col justify-between py-4 md:py-10">
                        <div>
                            <span className="inline-block bg-background px-1.5 py-0.5 text-xs font-semibold uppercase">{product.category}</span>
                            <h1 className="mt-4 max-w-xl font-cormorant text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.82] tracking-[-0.055em]">{product.name}</h1>
                        </div>

                        <div className="mt-8 max-w-sm">
                            <p className="text-base font-medium leading-snug md:text-lg">{product.tagline}</p>
                            <label className="mt-10 block border border-foreground/60 px-4 py-4 text-sm font-semibold uppercase">
                                <span className="sr-only">Chọn khối lượng</span>
                                <select defaultValue={product.sizeLabel} className="w-full appearance-none bg-transparent outline-none">
                                    <option>{product.sizeLabel}</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="relative order-first flex min-h-[43svh] items-center justify-center md:order-none md:min-h-[68svh]">
                        <Image
                            src={product.image}
                            alt={product.name}
                            width={1200}
                            height={1200}
                            priority
                            className="h-[50svh] w-auto max-w-full object-contain drop-shadow-[0_2rem_2rem_rgba(0,0,0,0.18)] md:h-[80svh]"
                        />
                    </div>

                    <div className="z-10 flex h-full items-end justify-end py-4 md:py-10">
                        <div className="w-full max-w-sm">
                            <button type="button" className="flex w-full items-center justify-between bg-background px-6 py-5 text-sm font-semibold uppercase transition-colors hover:bg-white">
                                <span>Thêm vào giỏ hàng</span>
                                <span>{product.price}</span>
                            </button>
                            <p className="mt-3 text-right text-sm font-medium">Miễn phí giao hàng cho đơn từ 500.000 vnđ</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="sticky top-[calc(100dvh-5rem)] z-50 flex min-h-20 items-center justify-between border-t border-foreground/15 bg-background px-page py-3 shadow-[0_-8px_25px_rgba(37,31,24,0.08)]">
                <div className="flex items-center gap-3">
                    <Image src={product.image} alt="" width={44} height={44} className="h-11 w-11 object-contain" />
                    <span className="hidden text-sm font-semibold sm:inline">{product.name}</span>
                </div>
                <button type="button" className="bg-foreground px-8 py-4 text-xs font-semibold uppercase text-background">
                    Thêm vào giỏ hàng
                </button>
            </div>

            <section className="px-page py-20 md:py-32" aria-labelledby="product-details-title">
                <div className="mx-auto grid max-w-[96rem] gap-14 md:grid-cols-2 md:gap-20">
                    <h2 id="product-details-title" className="font-cormorant text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-none tracking-[-0.05em]">
                        Về sản phẩm
                    </h2>

                    <div>
                        <dl className="border-t border-foreground/35">
                            {details.map(([label, value]) => (
                                <div key={label} className="grid grid-cols-[7rem_1fr] gap-6 border-b border-foreground/25 py-4 text-sm">
                                    <dt className="uppercase text-foreground/50">{label}</dt>
                                    <dd className="text-right font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>

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
                    <div className="ml-auto max-w-2xl">
                        <h2 id="product-story-title" className="font-cormorant text-[clamp(4rem,8vw,8rem)] font-semibold leading-none tracking-[-0.055em]">
                            Cao nguyên
                        </h2>
                        <p className="mt-8 max-w-xl text-base font-medium leading-relaxed md:text-lg">{product.story}</p>
                        <a href="/cau-chuyen/" className="mt-8 inline-block border-b border-current pb-1 text-sm font-semibold uppercase">
                            Đọc câu chuyện
                        </a>
                    </div>

                    <div className="mt-20 grid gap-6 md:grid-cols-2">
                        <figure>
                            <Image src="/images/coffee1.jpg" alt="Cà phê được phơi sau thu hoạch" width={1600} height={900} className="aspect-[4/3] w-full object-cover" />
                            <figcaption className="mt-2 text-xs">Mùa thu hoạch tại cao nguyên Việt Nam</figcaption>
                        </figure>
                        <figure className="md:mt-24">
                            <Image src="/images/coffee2.webp" alt="Thu hái cà phê chín" width={1600} height={900} className="aspect-[4/3] w-full object-cover" />
                            <figcaption className="mt-2 text-xs">Những trái cà phê được hái chọn lọc</figcaption>
                        </figure>
                    </div>
                </div>
            </section>
        </article>
    );
}
