import type { Metadata } from "next";
import { CheckoutPage } from "@/components/commerce/CheckoutPage";
import { notFound } from "next/navigation";
import { CHECKOUT_ENABLED } from "@/lib/commerce";

export const metadata: Metadata = { title: "Thanh toán | Là Vườn Coffee", robots: { index: false, follow: false } };
export default function Page() {
    if (!CHECKOUT_ENABLED) notFound();
    return <CheckoutPage />;
}
