import type { ReactNode } from "react";

type ImmersivePageProps = {
    backdrop: ReactNode;
    heroContent?: ReactNode;
    children: ReactNode;
    overlay?: boolean;
    className?: string;
};

export function ImmersivePage({ backdrop, heroContent, children, overlay = true, className = "", }: ImmersivePageProps): React.ReactElement {
    return (
        <div className="relative isolate min-h-dvh overflow-x-clip">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-neutral-950">
                <div className={`page-backdrop-parallax absolute inset-x-0 -inset-y-[16svh]${className}`}>
                    {backdrop}
                </div>

                {overlay && (
                    <>
                        <div className="absolute inset-0 bg-black/20" />

                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.16)_0%,transparent_38%,rgba(0,0,0,0.35)_100%)]" />

                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.28)_0%,transparent_48%)]" />
                    </>
                )}
            </div>

            <div className="relative z-10">
                <section className="relative min-h-svh">
                    {heroContent}
                </section>

                <div className="relative z-20">
                    {children}
                </div>
            </div>
        </div>
    );
}