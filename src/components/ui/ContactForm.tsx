"use client";

import { SubmitEventHandler } from "react";
import { EditorialReveal } from "@/components/ui/EditorialReveal";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
    const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        const form = new FormData(e.currentTarget);

        console.log(Object.fromEntries(form.entries()));
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-full min-w-0 max-w-none flex-1 flex-col md:max-w-md">
            <EditorialReveal>
                <p data-reveal="lines" className="text-sm tracking-[0.08em]">
                    Cần tư vấn? Để lại phương thức liên lạc.
                </p>
            </EditorialReveal>

            <div className="flex items-stretch gap-2 sm:gap-4">
                <input
                    name="contactInfo"
                    type="text"
                    aria-label="Email hoặc số điện thoại"
                    placeholder="Email / Số điện thoại"
                    className="min-w-0 flex-1 border-b border-foreground bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />

                <Button type="submit" aria-label="Gửi thông tin liên hệ">
                    gửi
                </Button>
            </div>
        </form>
    );
}
