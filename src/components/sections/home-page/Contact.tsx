"use client";

import { SubmitEventHandler } from "react";

export function ContactSection() {
    const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        const form = new FormData(e.currentTarget);

        console.log(Object.fromEntries(form.entries()));
    };

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-none flex-1 flex-col md:max-w-1/3">
            <p className="text-sm tracking-[0.08em]">Cần tư vấn? Để lại phương thức liên lạc.</p>

            <div className="flex items-stretch gap-2 sm:gap-4">
                <input
                    name="contactInfo"
                    type="text"
                    placeholder="Email / Số điện thoại"
                    className="flex-1 border-b border-foreground bg-transparent text-sm outline-none placeholder:text-neutral-400"
                />

                <button type="submit" aria-label="Submit email" className="bg-white px-5 py-[0.9rem] text-sm font-light uppercase sm:px-8">
                    gửi
                </button>
            </div>
        </form>
    );
}
