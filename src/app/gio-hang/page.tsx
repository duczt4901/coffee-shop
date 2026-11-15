import type { Metadata } from "next";
import { CartPage } from "@/components/commerce/CartPage";

export const metadata: Metadata = { title: "Giỏ hàng | Là Vườn Coffee", robots: { index: false, follow: false } };
export default function Page() {
    return <CartPage />;
}
