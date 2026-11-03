import type { Metadata } from "next";
import { CartPage } from "@/components/commerce/CartPage";

export const metadata: Metadata = { title: "Giỏ hàng | Coffee Shop", robots: { index: false, follow: false } };
export default function Page() {
    return <CartPage />;
}
