import { ContactSection } from "@/components/sections/home-page/Contact";
import Copy from "@/components/ui/TextReveal";

export function Footer() {
    return (
        <footer className="relative flex min-h-dvh flex-col justify-center overflow-hidden border-t-2 border-foreground/10 bg-background px-page py-12 text-foreground md:py-0">
            <div className="z-10 flex flex-col items-start justify-between gap-12 md:flex-row md:gap-10">
                <ContactSection />

                <nav className="flex w-full min-w-0 flex-col gap-10 text-sm text-foreground md:w-auto md:min-w-60">
                    <Copy>
                        <a href="#" className="transition-colors hover:text-neutral-900 flex justify-between gap-2">
                            <span className="text-foreground/50">Zalo</span>
                            <span>0123 456 789 ↗</span>
                        </a>
                        <a href="#" className="transition-colors hover:text-neutral-900 flex justify-between gap-2">
                            <span className="text-foreground/50">Facebook</span>
                            <span>ABC ↗</span>
                        </a>
                        <a href="#" className="transition-colors hover:text-neutral-900 flex justify-between gap-2">
                            <span className="text-foreground/50">Email</span>
                            <span>mail@email.com ↗</span>
                        </a>
                    </Copy>
                </nav>
            </div>

            {/* Main logo / text image */}
            <Copy start="top 20%">
                <span className="pointer-events-none block whitespace-nowrap font-cormorant text-[clamp(5rem,27vw,22em)] leading-[0.8] uppercase tracking-[0.08em] md:text-[22em] md:leading-[52svh]">
                    la vuon
                </span>
            </Copy>

            {/* Bottom */}
            <div className="flex flex-col gap-8 text-sm text-neutral-400 md:flex-row md:items-end md:justify-between">
                <Copy start="top 90%" resetStart="top 100%">
                    <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-3 md:gap-10">
                        <a href="#" className="hover:text-neutral-900">
                            Về chúng tôi ↗
                        </a>

                        <a href="#" className="hover:text-neutral-900">
                            Tất cả sản phẩm ↗
                        </a>

                        <a href="#" className="hover:text-neutral-900">
                            Dịch vụ ↗
                        </a>

                        <a href="/lien-he/" className="hover:text-neutral-900">
                            Liên hệ ↗
                        </a>
                    </div>
                </Copy>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-10">
                    <span>All Rights Reserved</span>

                    <a href="#" className="border-b border-neutral-400 hover:text-neutral-900">
                        Credits
                    </a>
                </div>
            </div>
        </footer>
    );
}
