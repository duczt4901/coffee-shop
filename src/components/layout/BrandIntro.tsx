import { siteConfig as database } from "@/lib/site-config";
import styles from "./BrandIntro.module.css";

export function BrandMark() {
    return (
        <svg data-brand-line data-brand-mark className={styles.mark} viewBox="0 0 199 199" aria-hidden="true">
            <path
                fill="currentColor"
                d="M130 136C117 145 87 147 70 132C48 114 50 83 69 68C87 53 109 53 127 67C147 81 148 107 130 120C115 133 91 132 80 117C67 101 74 85 88 79C101 73 116 79 120 90C124 102 112 115 102 112C92 111 89 104 93 96C94 92 97 91 100 94C96 103 105 107 110 101C116 91 103 82 92 88C79 94 80 108 89 115C104 128 126 119 130 105C137 87 120 70 103 70C81 68 65 84 65 104C65 129 91 144 130 136Z"
            />
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="6.5"
                strokeLinecap="round"
                d="M104 17L103 44M143 31L134 50M173 54L154 66M184 84L161 88M184 114L162 110M169 142L152 132M141 167L129 151M103 182L104 158M65 168L73 151M33 142L49 132M15 112L39 110M20 81L40 86M34 49L51 65M67 29L75 50"
            />
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
