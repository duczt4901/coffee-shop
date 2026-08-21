import { Cormorant_Upright, Lexend_Deca, Montserrat } from "next/font/google";

export const montserrat = Montserrat({
    weight: ['100', '200', '300', '400', '500', '700', '800', '900'],
    subsets: ['latin'],
    display:'swap',
    fallback: ['Arial', 'sans-serif'],
});

export const lexend = Lexend_Deca({
    weight: ['100', '200', '300', '400', '500', '700', '800', '900'],
    subsets: ['latin'],
    display:'swap',
    variable: '--font-lexend',
    fallback: ['Arial', 'sans-serif'],
});

export const cormorantUpright = Cormorant_Upright({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin', 'vietnamese'],
    display: 'swap',
    variable: '--font-cormorant-upright',
    fallback: ['Georgia', 'serif'],
});
