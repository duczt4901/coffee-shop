import { useId } from "react";
import { database } from "@/lib/database";
import styles from "./BrandIntro.module.css";

export function BrandMark() {
    const id = useId();
    return (
        <svg data-brand-line data-brand-mark className={styles.mark} viewBox="0 0 199 199" aria-hidden="true">
            <defs>
                <filter id={`${id}-ink`} colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 -1 0 1" />
                </filter>
                <mask id={`${id}-sun`} style={{ maskType: "alpha" }}>
                    <image data-loading-logo href="/images/brand/lavuon-sun-source.png" width="199" height="199" filter={`url(#${id}-ink)`} />
                </mask>
            </defs>
            <rect width="199" height="199" fill="currentColor" mask={`url(#${id}-sun)`} />
        </svg>
    );
}

export function BrandIntro({ heading = false }: { heading?: boolean }) {
    const Slogan = heading ? "h1" : "p";
    return (
        <div className={styles.intro}>
            <BrandMark />
            <p data-brand-line data-brand-text className={styles.name}>
                {database.site.name}
            </p>
            <Slogan data-brand-line data-brand-text className={styles.slogan}>
                Chậm một chút, đậm một ngày.
            </Slogan>
        </div>
    );
}
