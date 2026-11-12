"use client";

import { EditorialReveal, RevealLine } from "@/components/ui/EditorialReveal";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
    const endpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT?.trim();

    return (
        <form action={endpoint || undefined} method="post" onSubmit={endpoint ? undefined : (event) => event.preventDefault()} className="flex w-full min-w-0 max-w-none flex-1 flex-col md:max-w-md">
            <EditorialReveal>
                <p data-reveal="lines" className="text-sm tracking-[0.08em]">
                    Cần tư vấn? Để lại phương thức liên lạc.
                </p>
            </EditorialReveal>

            <div className="flex items-stretch gap-2 sm:gap-4">
                <label className="relative min-w-0 flex-1">
                <input
                    name="contactInfo"
                    required
                    disabled={!endpoint}
                    type="text"
                    aria-label="Email hoặc số điện thoại"
                    placeholder="Email / Số điện thoại"
                    className="h-full w-full min-w-0 border-b border-transparent bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />
                <RevealLine side="bottom" />
                </label>

                <Button type="submit" disabled={!endpoint} aria-label="Gửi thông tin liên hệ">
                    gửi
                </Button>
            </div>
            {!endpoint && <p className="mt-2 text-xs text-foreground/60">Kênh gửi tư vấn đang được cập nhật.</p>}
        </form>
    );
}
