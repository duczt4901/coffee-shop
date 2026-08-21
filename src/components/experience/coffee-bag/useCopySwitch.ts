"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(ScrollTrigger);

type UseCopySwitchProps = {
    containerRef: RefObject<HTMLDivElement | null>;
    backCopyRef: RefObject<HTMLSpanElement | null>;
    frontCopyRef: RefObject<HTMLSpanElement | null>;
    switchProgress: number;
};

export function useCopySwitch({
                                  containerRef,
                                  backCopyRef,
                                  frontCopyRef,
                                   switchProgress,
                               }: UseCopySwitchProps): void {
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            if (!started) return;

            const container = containerRef.current;
            const backCopy = backCopyRef.current;
            const frontCopy = frontCopyRef.current;

            if (!container || !backCopy || !frontCopy) return;

            let showingFront = false;

            gsap.set(backCopy, { autoAlpha: 1 });
            gsap.set(frontCopy, { autoAlpha: 0 });

            const setCopyVisibility = (showFront: boolean) => {
                gsap.to(backCopy, {
                    autoAlpha: showFront ? 0 : 1,
                    duration: 0.35,
                    ease: "power2.out",
                    overwrite: true,
                });

                gsap.to(frontCopy, {
                    autoAlpha: showFront ? 1 : 0,
                    duration: 0.35,
                    ease: "power2.out",
                    overwrite: true,
                });
            };

            const trigger = ScrollTrigger.create({
                trigger: container,
                start: "top top",
                end: "bottom bottom",
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const nextShowingFront = self.progress >= switchProgress;
                    if (nextShowingFront === showingFront) return;

                    showingFront = nextShowingFront;
                    setCopyVisibility(showingFront);
                },
                onRefresh: (self) => {
                    showingFront = self.progress >= switchProgress;

                    gsap.set(backCopy, { autoAlpha: showingFront ? 0 : 1 });
                    gsap.set(frontCopy, { autoAlpha: showingFront ? 1 : 0 });
                },
            });

            return () => {
                trigger.kill();
            };
        },
        {
            scope: containerRef,
            dependencies: [started, switchProgress],
        }
    );
}
