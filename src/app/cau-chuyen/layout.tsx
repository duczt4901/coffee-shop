import type { ReactNode } from "react";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({ title: "Câu chuyện | Là Vườn Coffee", path: "/cau-chuyen/" });

export default function StoryLayout({ children }: { children: ReactNode }) {
    return children;
}
