import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import styles from "./Button.module.css";

type ButtonProps = { fullWidth?: boolean } & (({ href: string } & ComponentProps<typeof Link>) | ({ href?: never } & ComponentProps<"button">));

export function Button({ fullWidth, className, ...props }: ButtonProps) {
    const classes = cn(styles.button, fullWidth && styles.fullWidth, className);
    if (props.href !== undefined) return <Link {...props} className={classes} />;
    return <button type="button" {...props} className={classes} />;
}
