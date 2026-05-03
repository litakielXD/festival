import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-foreground outline-none ring-accent placeholder:text-muted focus:ring-2",
        className
      )}
      {...props}
    />
  );
}
