import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { FaqContent } from "./FaqContent";

export const metadata: Metadata = createMetadata({
    title: "Câu hỏi thường gặp | Coffee Shop",
    description: "Giải đáp về cà phê, cách pha, bảo quản và đặt hàng tại Coffee Shop.",
    path: "/faq/",
});

export default function FaqPage() {
    return <FaqContent />;
}
