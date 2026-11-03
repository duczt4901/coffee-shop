import type { Metadata } from "next";
import { CheckoutPage } from "@/components/commerce/CheckoutPage";

export const metadata: Metadata = { title: "Thanh toán | Coffee Shop", robots: { index: false, follow: false } };
export default function Page() {
    return <CheckoutPage />;
}
