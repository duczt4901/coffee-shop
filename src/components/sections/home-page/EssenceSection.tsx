"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CoffeeStoryHorizontal } from "./CoffeeStoryHorizontal";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(ScrollTrigger);

const introScrollViewports = 1.6;
const horizontalScrollViewports = 3.5;
const sectionHeightSvh = (1 + introScrollViewports + horizontalScrollViewports) * 100;

export function EssenceSection(): React.ReactElement {

    const sectionRef = useRef<HTMLElement>(null);
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            if (!started) return;

            const root = sectionRef.current;
            if (!root) return;

            const copy = root.querySelector<HTMLElement>(".lam-dong-zoom__copy",);
            const location = root.querySelector<HTMLElement>(".lam-dong-zoom__location",);
            const photo = root.querySelector<HTMLElement>(".lam-dong-zoom__photo",);
            const knockout = root.querySelector<HTMLElement>(".lam-dong-zoom__knockout",);

            if (!copy || !location || !photo || !knockout) return;

            gsap.set(copy, {
                autoAlpha: 1,
            });

            gsap.set(location, {
                autoAlpha: 0,
                scale: 1,
            });

            gsap.set(photo, {
                top: "50%",
                width: "calc(var(--lam-dong-hole-width) * 2)",
                height: "calc(var(--lam-dong-hole-height) * 2)",
                autoAlpha: 0,
                "--lam-dong-overlay-opacity": 1,
            });

            gsap.set(knockout, {
                autoAlpha: 1,
                backgroundSize: "100% 100%",
            });

            const introHold = 0.15;

            const timelineDuration = 1 + introHold;
            const knockoutFadeStart = timelineDuration * 0.8;
            const knockoutFadeDuration = timelineDuration * 0.2;

            const timeline = gsap.timeline({
                defaults: {
                    ease: "none",
                },

                scrollTrigger: {
                    trigger: root,
                    start: "top top",
                    end: () => `+=${window.innerHeight * introScrollViewports}px`,
                    scrub: true,
                    invalidateOnRefresh: true,
                },
            });

            timeline
                .addLabel("animate", introHold)

                .to(copy, {
                    autoAlpha: 0,
                    duration: 0.35,
                }, "animate")

                .fromTo(location, {
                    autoAlpha: 0,
                    scale: 1,
                }, {
                    autoAlpha: 1,
                    scale: 1,
                    duration: 0.15,
                }, "animate+=0.35")

                .to(photo, {
                    width: "100vw",
                    height: "100svh",
                    autoAlpha: 1,
                    duration: 0.5,
                }, "animate")

                .to(photo, {
                    width: "110vw",
                    height: "110svh",
                    duration: 0.5,
                }, "animate+=0.5")

                .to(photo, {
                    "--lam-dong-overlay-opacity": 0,
                    duration: 1,
                }, "animate")

                .to(knockout, {
                    backgroundSize: "350% 350%",
                    duration: 0.5,
                }, "animate")

                .to(knockout, {
                    autoAlpha: 1,
                    duration: 0.15,
                }, "animate+=0.35")

                .to(knockout, {
                    backgroundSize: "2100% 2100%",
                    duration: 0.4,
                }, "animate+=0.5")

                .to(knockout, {
                    autoAlpha: 0,
                    duration: knockoutFadeDuration,
                    ease: "none",
                }, knockoutFadeStart)

                .to(location, {
                    autoAlpha: 0,
                    duration: 0.1,
                }, "animate+=0.9")
        },
        {
            scope: sectionRef,
            dependencies: [started],
        },
    );

    return (
        <section
            ref={sectionRef}
            className="lam-dong-zoom font-cormorant"
            style={{ height: `${sectionHeightSvh}svh` }}
        >
            <div className="lam-dong-zoom__sticky">
                <CoffeeStoryHorizontal introScrollViewports={introScrollViewports} />

                <p className="lam-dong-zoom__location">
                    LÂM ĐỒNG
                </p>

                <div className="lam-dong-zoom__knockout-viewport" aria-hidden="true">
                    <div className="lam-dong-zoom__knockout" />
                </div>

                <div className="lam-dong-zoom__copy">
                    <p className="text-xs uppercase tracking-[0.08em] sm:text-sm">
                        <em className="normal-case">trong </em> đầm{" "}
                        <em className="normal-case">gì đẹp bằng</em> <b>sen</b>
                    </p>

                    <h2 className="mt-10 max-w-6xl text-center text-[clamp(2.25rem,11.5vw,3rem)] font-semibold uppercase leading-[0.86] tracking-[-0.055em] sm:mt-12 sm:text-[clamp(3.25rem,6.4vw,7.5rem)]">
                        <span className="block">
                            <em className="block normal-case sm:mr-[0.12em] font-normal sm:inline">
                                lá xanh
                            </em> bông trắng
                        </span>

                        <span className="block">
                            lại chen
                            <em className="block normal-case sm:mr-[0.12em] font-normal sm:inline">
                                nhị vàng
                            </em>
                        </span>
                    </h2>
                </div>

            </div>
        </section>
    );
}
