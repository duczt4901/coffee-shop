import Image from "next/image";
import { ContactSection } from "@/components/sections/home-page/Contact";
import Copy from "@/components/ui/TextReveal";

export function Footer() {
    return (
        <footer className="relative flex min-h-svh flex-col justify-center border-t-2 border-foreground/10 bg-background px-page text-foreground">
            <div className="flex items-start justify-between gap-10 z-10">
                <ContactSection/>

                <nav className="flex flex-col gap-10 text-sm text-foreground min-w-60">
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
                <span className="uppercase tracking-[0.08em] font-cormorant text-[37.5em] leading-[70svh] pointer-events-none">
                    Logo
                </span>
            </Copy>

            {/* Bottom */}
            <div className="flex flex-col gap-8 text-sm text-neutral-400 md:flex-row md:items-end md:justify-between">
                <Copy start="top 90%" resetStart="top 100%">
                    <div className="flex items-center gap-10 justify-start">
                        <a href="#" className="hover:text-neutral-900">
                            Về chúng tôi ↗
                        </a>

                        <a href="#" className="hover:text-neutral-900">
                            Tất cả sản phẩm ↗
                        </a>

                        <a href="#" className="hover:text-neutral-900">
                            Dịch vụ ↗
                        </a>

                        <a href="#" className="hover:text-neutral-900">
                            Liên hệ ↗
                        </a>
                    </div>
                </Copy>

                <div className="flex items-center gap-10">
                    <span>All Rights Reserved</span>

                    <a
                        href="#"
                        className="border-b border-neutral-400 hover:text-neutral-900"
                    >
                        Credits
                    </a>
                </div>
            </div>
        </footer>
    );
}
