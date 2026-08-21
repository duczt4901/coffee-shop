"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { ScribbleText } from "@/components/ui/ScribbleText";
import { database } from "@/lib/database";
import { cn } from "@/lib/utils";
import Copy from "@/components/ui/TextReveal";
import { ChevronDownIcon } from "@/components/ui/Chevron";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

const START_LOGO_SIZE = 180;
const END_LOGO_SIZE = 48;
const COLOR_TRIGGER_VH = 0.9;
const LOGO_TRIGGER_VH = 2.5;
const LOGO_SCROLL_END_VH = 1;
const HEADER_HIDE_START_PX = 80;
const LOADING_LOGO_SCALE = 0.85;

export function NavBar(): React.ReactElement {
    const header = database.header;
    const pathname = usePathname();
    const isHome = pathname === "/";
    const isStory = pathname.startsWith("/cau-chuyen");
    const { started } = useExperienceRuntime();

    const [triggered, setTriggered] = useState(!isHome);
    const [isAtTop, setIsAtTop] = useState(true);

    const logoRef = useRef<HTMLAnchorElement>(null);
    const textRef = useRef<HTMLParagraphElement>(null);
    const [logoTriggered, setLogoTriggered] = useState(false);
    const [logoHidden, setLogoHidden] = useState(false);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        let ticking = false;

        lastScrollYRef.current = window.scrollY;

        const updateHeader = () => {
            const logo = logoRef.current;
            const text = textRef.current;

            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;

            const nextTriggered =
                !isHome || scrollY > viewportHeight * COLOR_TRIGGER_VH;

            const nextLogoTriggered =
                scrollY > (isHome ? viewportHeight * LOGO_TRIGGER_VH : HEADER_HIDE_START_PX);

            setIsAtTop(scrollY <= 1);
            setTriggered(nextTriggered);
            setLogoTriggered(nextLogoTriggered);

            const deltaY = scrollY - lastScrollYRef.current;

            if (!nextLogoTriggered) {
                setLogoHidden(false);
            } else if (deltaY > 1) {
                setLogoHidden(true);
            } else if (deltaY < -1) {
                setLogoHidden(false);
            }

            lastScrollYRef.current = scrollY;

            // ---- giữ nguyên toàn bộ animation size LOGO bên dưới ----

            if (!logo || !text) {
                ticking = false;
                return;
            }

            if (!isHome) {
                text.style.fontSize = `${END_LOGO_SIZE}px`;
                logo.style.transform = "translate3d(-50%, 0, 0)";
                ticking = false;
                return;
            }

            const logoScrollEnd = viewportHeight * LOGO_SCROLL_END_VH;

            const progress = Math.min(
                Math.max(scrollY / logoScrollEnd, 0),
                1
            );

            const size =
                START_LOGO_SIZE +
                (END_LOGO_SIZE - START_LOGO_SIZE) * progress;

            const startTop =
                viewportHeight * 0.5 - size / 2;

            const top =
                startTop + (0 - startTop) * progress;

            text.style.fontSize = `${size}px`;
            logo.style.transform =
                `translate3d(-50%, ${top}px, 0)`;

            ticking = false;
        };

        const handleScroll = () => {
            if (ticking) return;

            ticking = true;
            requestAnimationFrame(updateHeader);
        };

        updateHeader();

        window.addEventListener("scroll", handleScroll, {
            passive: true,
        });
        window.addEventListener("resize", updateHeader);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", updateHeader);
        };
    }, [isHome]);

    return (
        <nav
            aria-label="Điều hướng chính"
            className={cn("pointer-events-none fixed inset-x-0 top-0 z-11 h-svh transition-colors duration-300",
                triggered ? "text-foreground" : "text-background"
            )}
        >
            <div className={cn("relative flex w-full items-center px-page py-5 transition-opacity duration-300",
                    logoTriggered && logoHidden ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
            )}>
                <Copy delay={0.5}>
                    <div
                        className={cn(
                            "flex items-start gap-10 transition-opacity duration-150",
                            isStory && "max-md:absolute max-md:inset-x-0 max-md:top-16 max-md:justify-center max-md:gap-0",
                            isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"),
                        )}
                    >
                        <ScribbleText.Root>
                            {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                                <ScribbleText.Item key={item.href} text={item.ariaLabel} href={item.href} />
                            ))}
                        </ScribbleText.Root>
                    </div>
                </Copy>

                <Link
                    ref={logoRef}
                    href={header.href}
                    aria-label={header.ariaLabel}
                    className="absolute left-1/2 top-5 flex flex-col items-center will-change-transform"
                    style={{
                        transform: isHome
                            ? "translate3d(-50%, calc(50svh - 90px), 0)"
                            : "translate3d(-50%, 0, 0)",
                    }}
                >
                    <p
                        ref={textRef}
                        className="font-cormorant whitespace-nowrap p-4 font-bold leading-none tracking-wide will-change-[font-size,transform]"
                        style={{
                            fontSize: isHome ? START_LOGO_SIZE : END_LOGO_SIZE,
                            transform: isHome
                                ? `scale(${started ? 1 : LOADING_LOGO_SCALE})`
                                : undefined,
                            transition: isHome
                                ? "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)"
                                : undefined,
                            transitionDelay: isHome && started ? "0.3s" : "0s",
                        }}
                    >
                        <span className={cn(isHome && "landing-logo-reveal")}>LOGO</span>
                    </p>
                    <span aria-hidden="true"
                        className={cn("-translate-y-4 whitespace-nowrap text-sm font-light tracking-wide transition-opacity duration-150",
                            isHome && isAtTop && started ? "opacity-100 delay-500" : "opacity-0 delay-0",
                        )}
                    >
                        <Copy delay={0.5}>
                            <p>Nhiễu điều phủ lấy giá gương, người trong một nước phải thương nhau cùng.</p>
                        </Copy>
                    </span>
                </Link>

                <Copy delay={0.5}>
                    <div className={cn(
                        "flex flex-1 items-center justify-end transition-opacity duration-150",
                        isStory && "max-md:hidden",
                        isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"),
                    )}>
                        <button
                            className={cn(
                                "flex items-center gap-2 p-3",
                                "text-sm font-medium uppercase tracking-wide transition",
                            )}
                        >
                            <span>VI-VN</span>
                            <ChevronDownIcon open={false} strokeWidth={1.5} />
                        </button>
                    </div>
                </Copy>
            </div>

            <div
                aria-hidden="true"
                className={cn(
                    "absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-150",
                    isHome && isAtTop && started ? "opacity-100 delay-500" : "opacity-0 delay-0"
                )}
            >
                <span className="h-8 w-px bg-current" />
                <span className="h-2 w-2 rotate-45 border-b border-r border-current" />
            </div>
        </nav>
    );
}
