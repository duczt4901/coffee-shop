import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { FaqContent } from "./FaqContent";

export const metadata: Metadata = createMetadata({
    title: "Câu hỏi thường gặp | Là Vườn Coffee",
    description: "Giải đáp về cà phê, cách pha, bảo quản và đặt hàng tại Là Vườn Coffee.",
    path: "/faq/",
});

export default function FaqPage() {
    return <FaqContent />;
}
