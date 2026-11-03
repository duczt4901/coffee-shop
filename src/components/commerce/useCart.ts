"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getCartLines, MAX_QUANTITY, readCart, type CartItem } from "@/lib/commerce";

const KEY = "coffee-shop-cart-v1";
const listeners = new Set<() => void>();
let memory = "[]";
let storageUnavailable = false;
function snapshot() {
    if (storageUnavailable) return memory;
    try {
        return localStorage.getItem(KEY) ?? "[]";
    } catch {
        storageUnavailable = true;
        return memory;
    }
}
function subscribe(listener: () => void) {
    listeners.add(listener);
    const sync = (event: StorageEvent) => {
        if (event.key === KEY || event.key === null) listener();
    };
    window.addEventListener("storage", sync);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", sync);
    };
}
function write(items: CartItem[]) {
    memory = JSON.stringify(items);
    try {
        localStorage.setItem(KEY, memory);
        storageUnavailable = false;
    } catch {
        storageUnavailable = true;
    }
    listeners.forEach((listener) => listener());
}

export function useCart() {
    const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
    const ready = useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
    const items = useMemo(() => readCart(raw), [raw]);
    const lines = useMemo(() => getCartLines(items), [items]);
    return {
        ready,
        items,
        lines,
        count: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
        add(slug: string, quantity = 1) {
            write(readCart(JSON.stringify([...readCart(snapshot()), { slug, quantity }])));
        },
        update(slug: string, quantity: number) {
            if (!Number.isInteger(quantity)) return;
            write(
                readCart(snapshot()).flatMap((item) =>
                    item.slug !== slug ? [item] : quantity > 0 ? [{ slug, quantity: Math.min(MAX_QUANTITY, quantity) }] : [],
                ),
            );
        },
        remove(slug: string) {
            write(readCart(snapshot()).filter((item) => item.slug !== slug));
        },
        clear() {
            write([]);
        },
    };
}
