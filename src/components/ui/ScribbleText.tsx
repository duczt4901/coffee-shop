"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ScribbleVariant = {
    id: string;
    viewBox: string;
    path: string;
    className: string;
};

type ScribbleItemProps = {
    href: string;
    text: string;
    strokeWidth?: number;
};

type ScribbleRootProps = {
    children: ReactNode;
};

const SCRIBBLES: ScribbleVariant[] = [
    {
        id: "soft-hook",
        viewBox: "0 0 120 28",
        path: "M 5 18 C 54 3 55 2 44 12 C 38 17 69 13 86 5 C 101 1 76 16 116 9",
        className: "-bottom-1.5 h-[1em] w-[90%] rotate-[2deg]",
    },
    {
        id: "wave",
        viewBox: "0 0 120 24",
        path: "M6 14 C10 8,14 8,18 14 C22 20,26 20,30 14 C34 8,38 8,42 14 C46 20,50 20,54 14 C58 8,62 8,66 14 C70 20,74 20,78 14 C82 8,86 8,90 14 C94 20,98 20,102 14 C106 8,110 8,114 14",
        className: "-bottom-1 h-[1.4em] w-[90%]",
    },
    {
        id: "loop-roll",
        viewBox: "0 0 120 28",
        path: "M6 16 C28 11,46 10,60 11 C68 12,74 13,79 14 C74 14,69 16,66 18 C64 20,65 22,69 23 C74 24,80 22,82 18 C83 15,79 13,74 13 C84 13,98 13,114 14",
        className: "-bottom-1 h-[1.2em] w-[90%] -rotate-1",
    },
    {
        id: "tail-wave",
        viewBox: "0 0 120 24",
        path: "M 6 14 C 12 10 32 8 24 14 C 16 20 36 18 42 14 C 49 10 68 2 109 4",
        className: "-bottom-1 h-[1.2em] w-[90%] rotate-[2deg]",
    },
];

type ScribbleStore = {
    getNext: () => ScribbleVariant;
};

const ScribbleContext = createContext<ScribbleStore | null>(null);

function Root({ children }: ScribbleRootProps): ReactElement {
    const previousIdRef = useRef<string | null>(null);

    const getNext = (): ScribbleVariant => {
        const previous = previousIdRef.current;

        const available = previous
            ? SCRIBBLES.filter((scribble) => scribble.id !== previous)
            : SCRIBBLES;

        const next = available[Math.floor(Math.random() * available.length)];

        previousIdRef.current = next.id;

        return next;
    };

    return (
        <ScribbleContext.Provider value={{ getNext }}>
            {children}
        </ScribbleContext.Provider>
    );
}

function Item({
                  href,
                  text,
                  strokeWidth = 2,
              }: ScribbleItemProps): ReactElement {
    const store = useContext(ScribbleContext);

    if (!store) {
        throw new Error(
            "ScribbleText.Item must be used inside ScribbleText.Root"
        );
    }

    const [scribble, setScribble] = useState<ScribbleVariant>(
        SCRIBBLES[0]
    );

    const [hovered, setHovered] = useState(false);

    const animationFrameRef = useRef<number | null>(null);

    const cancelPendingAnimation = () => {
        if (animationFrameRef.current === null) return;

        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    };

    const handlePointerEnter = () => {
        cancelPendingAnimation();

        const next = store.getNext();

        setHovered(false);
        setScribble(next);

        animationFrameRef.current = requestAnimationFrame(() => {
            animationFrameRef.current = requestAnimationFrame(() => {
                setHovered(true);
                animationFrameRef.current = null;
            });
        });
    };

    const handlePointerLeave = () => {
        cancelPendingAnimation();
        setHovered(false);
    };

    useEffect(() => {
        return cancelPendingAnimation;
    }, []);

    return (
        <span
            className="relative inline-flex shrink-0 items-center justify-center whitespace-nowrap p-3 text-center leading-none"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            <Link
                href={href}
                className={cn(
                    "relative z-10 flex w-full items-center justify-center gap-[0.25em]",
                    "text-center text-sm font-medium uppercase tracking-wide"
                )}
            >
                {text}
            </Link>

            <svg
                key={scribble.id}
                className={cn(
                    "pointer-events-none absolute left-1/2 z-0 block",
                    "origin-center -translate-x-1/2 overflow-visible",
                    scribble.className
                )}
                viewBox={scribble.viewBox}
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    className={cn(
                        "[stroke-dasharray:100]",
                        "transition-[stroke-dashoffset] duration-500 ease-out",
                        hovered
                            ? "[stroke-dashoffset:0]"
                            : "[stroke-dashoffset:100]"
                    )}
                    d={scribble.path}
                    pathLength={100}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </span>
    );
}

export const ScribbleText = {
    Root,
    Item,
};
