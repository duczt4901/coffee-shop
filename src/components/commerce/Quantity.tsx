"use client";

import { MAX_QUANTITY } from "@/lib/commerce";
import styles from "./Commerce.module.css";

export function Quantity({ value, onChange, label = "Số lượng" }: { value: number; onChange: (quantity: number) => void; label?: string }) {
    return (
        <div className={styles.quantity}>
            <button type="button" aria-label={`Giảm ${label.toLocaleLowerCase("vi")}`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
                −
            </button>
            <input
                aria-label={label}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_QUANTITY}
                value={value}
                onChange={(event) => {
                    const next = event.currentTarget.valueAsNumber;
                    if (Number.isInteger(next) && next >= 1 && next <= MAX_QUANTITY) onChange(next);
                }}
            />
            <button type="button" aria-label={`Tăng ${label.toLocaleLowerCase("vi")}`} disabled={value >= MAX_QUANTITY} onClick={() => onChange(value + 1)}>
                +
            </button>
        </div>
    );
}
