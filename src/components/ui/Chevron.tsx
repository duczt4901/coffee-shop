import { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ChevronDownIconProps = SVGProps<SVGSVGElement> & {
    open?: boolean;
    strokeWidth?: number;
};

export function ChevronDownIcon({ open = false, className, strokeWidth = 1.5, ...props }: ChevronDownIconProps) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className={cn("transition-transform", open && "rotate-180", className)}{...props}>
            <path d="M4 6 8 10l4-4" fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
            />
        </svg>
    );
}