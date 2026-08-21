"use client";

import { useRef, type ReactElement } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(ScrollTrigger);

const stories = [
    {
        title: "Từ HẠT",
        image: "/images/lamdong/img_2.png",
    },
    {
        title: "và PHƠI SẤY",
        image: "/images/lamdong/img.png",
    },
    {
        title: "đến ĐÓNG GÓI",
        image: "/images/lamdong/img_1.png",
    },
];

const edgeHold = 0.08;

export function CoffeeStoryHorizontal({
    introScrollViewports,
}: {
    introScrollViewports: number;
}): ReactElement {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { started } = useExperienceRuntime();

    useLenis(() => ScrollTrigger.update());

    useGSAP(
        () => {
            if (!started) return;

            const photo = sectionRef.current;
            const section = photo?.closest<HTMLElement>(".lam-dong-zoom");
            const slides = photo?.querySelector<HTMLElement>(".coffee-slider__slides");
            const slider = photo?.querySelector<HTMLElement>(".coffee-slider__viewport");

            if (!photo || !section || !slides || !slider) return;

            const slideItems = gsap.utils.toArray<HTMLElement>(".coffee-slider__slide", slides);
            const images = gsap.utils.toArray<HTMLImageElement>(".coffee-slider__image", slides);
            const title = photo.querySelector<HTMLElement>(".coffee-slider__title");
            const titleItems = gsap.utils.toArray<HTMLElement>(
                ".coffee-slider__title-item",
                photo,
            );

            if (
                !title ||
                slideItems.length !== stories.length ||
                images.length !== slideItems.length ||
                titleItems.length !== slideItems.length
            ) return;

            const motion = gsap.matchMedia();

            motion.add("(prefers-reduced-motion: no-preference)", () => {
                gsap.set(images, { x: 0, scale: 1.2 });
                gsap.set(title, { autoAlpha: 0 });
                gsap.set(titleItems, { opacity: 0.28 });

                slideItems.forEach((slide, index) => {
                    gsap.set(slide, {
                        xPercent: index === 0 ? 0 : 100,
                        zIndex: index,
                    });
                });

                let currentVisibleIndex = -1;

                const showTitle = (activeIndex: number): void => {
                    if (currentVisibleIndex === activeIndex) return;
                    currentVisibleIndex = activeIndex;

                    titleItems.forEach((item, index) => {
                        gsap.to(item, {
                            opacity: index === activeIndex ? 1 : 0.28,
                            duration: 0.5,
                            ease: "power2.out",
                            overwrite: true,
                        });
                    });
                };

                showTitle(0);

                const trigger = ScrollTrigger.create({
                    trigger: section,
                    start: () => `top+=${window.innerHeight * introScrollViewports} top`,
                    end: "bottom bottom",
                    scrub: 1,
                    invalidateOnRefresh: true,
                    onEnter: () => {
                        showTitle(0);
                        gsap.to(title, {
                            autoAlpha: 1,
                            duration: 0.35,
                            overwrite: true,
                        });
                    },
                    onLeaveBack: () => {
                        gsap.to(title, {
                            autoAlpha: 0,
                            duration: 0.2,
                            overwrite: true,
                        });
                    },
                    onUpdate: ({ progress }) => {
                        const slideWidth = slider.offsetWidth;
                        const horizontalProgress = gsap.utils.clamp(
                            0,
                            1,
                            (progress - edgeHold) / (1 - edgeHold * 2),
                        );
                        const totalProgress = horizontalProgress * (slideItems.length - 1);
                        const currentSlide = Math.min(
                            slideItems.length - 2,
                            Math.floor(totalProgress),
                        );
                        const sliderProgress =
                            horizontalProgress === 1
                                ? 1
                                : totalProgress - currentSlide;

                        slideItems.forEach((slide, index) => {
                            let xPercent = 100;

                            if (index <= currentSlide) {
                                xPercent = 0;
                            } else if (index === currentSlide + 1) {
                                xPercent = (1 - sliderProgress) * 100;
                            }

                            gsap.set(slide, { xPercent });
                        });

                        images.forEach((image, index) => {
                            if (index === currentSlide) {
                                gsap.set(image, {
                                    x: -sliderProgress * slideWidth * 0.05,
                                    scale: 1.2,
                                });
                            } else if (index === currentSlide + 1) {
                                gsap.set(image, {
                                    x: (sliderProgress - 1) * slideWidth * 0.85,
                                    scale: 1.2,
                                });
                            } else {
                                gsap.set(image, { x: 0, scale: 1.2 });
                            }
                        });

                        showTitle(Math.round(totalProgress));
                    },
                });

                return () => {
                    trigger.kill();
                };
            });

            return () => motion.revert();
        },
        { scope: sectionRef, dependencies: [started] },
    );

    return (
        <div
            ref={sectionRef}
            className="lam-dong-zoom__photo coffee-slider"
            role="group"
            aria-label="Câu chuyện cà phê Lâm Đồng"
        >
            <div className="coffee-slider__sticky">
                <div className="coffee-slider__viewport">
                    <div className="coffee-slider__slides">
                        {stories.map((story) => (
                            <article
                                className="coffee-slider__slide"
                                key={story.title}
                            >
                                <div className="coffee-slider__media">
                                    <img
                                        className="coffee-slider__image"
                                        src={story.image}
                                        alt={`${story.title} cà phê Lâm Đồng`}
                                    />

                                    <span
                                        className="coffee-slider__overlay"
                                        aria-hidden="true"
                                    />
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="coffee-slider__title">
                        <h2>
                            {stories.map((story, index) => (
                                <span className="coffee-slider__title-item" key={story.title}>
                                    {story.title}
                                    {index < stories.length - 1 ? ", " : "."}
                                </span>
                            ))}
                        </h2>
                    </div>
                </div>
            </div>
        </div>
    );
}
