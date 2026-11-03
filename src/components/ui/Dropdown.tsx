"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDownIcon } from "./Chevron";
import styles from "./Dropdown.module.css";

type Option = { value: string; label: string };
export function Dropdown({
    value,
    options,
    onChange,
    label,
    id,
}: {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    label: string;
    id?: string;
}) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const root = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );

    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [open]);
    useEffect(() => {
        if (open) document.getElementById(`${controlId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }, [open, active, controlId]);

    const choose = (index: number) => {
        if (!options[index]) return;
        onChange(options[index].value);
        setOpen(false);
        button.current?.focus();
    };
    const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
            if (event.key === "Home") setActive(0);
            else if (event.key === "End") setActive(options.length - 1);
            else setActive(Math.max(0, Math.min(options.length - 1, (open ? active : selected) + (event.key === "ArrowDown" ? 1 : -1))));
        } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
        } else if ((event.key === "Enter" || event.key === " ") && open) {
            event.preventDefault();
            choose(active);
        } else if (event.key === "Tab") setOpen(false);
        else if (event.key.length === 1 && event.key !== " ") {
            const match = options.findIndex((option) => option.label.toLocaleLowerCase("vi").startsWith(event.key.toLocaleLowerCase("vi")));
            if (match >= 0) {
                setActive(match);
                setOpen(true);
            }
        }
    };

    return (
        <div
            ref={root}
            className={styles.dropdown}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <button
                ref={button}
                id={controlId}
                type="button"
                role="combobox"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${controlId}-options`}
                aria-activedescendant={open ? `${controlId}-${active}` : undefined}
                className={styles.trigger}
                onKeyDown={handleKey}
                onClick={() => {
                    setActive(selected);
                    setOpen(!open);
                }}
            >
                <span>{options[selected]?.label}</span>
                <ChevronDownIcon open={open} />
            </button>
            {open && (
                <ul id={`${controlId}-options`} role="listbox" aria-label={label} className={styles.options} data-lenis-prevent>
                    {options.map((option, index) => (
                        <li
                            key={option.value}
                            id={`${controlId}-${index}`}
                            role="option"
                            aria-selected={option.value === value}
                            className={index === active ? styles.active : ""}
                            onPointerMove={() => setActive(index)}
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() => choose(index)}
                        >
                            <span>{option.label}</span>
                            <span aria-hidden="true">{option.value === value ? "✓" : ""}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
