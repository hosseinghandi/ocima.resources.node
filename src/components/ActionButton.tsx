import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

const variants = {
  edit: { icon: "edit", style: "border-primary/30 bg-primary-tint text-primary-dark hover:border-primary hover:bg-primary hover:text-white" },
  delete: { icon: "trash", style: "border-red-200 bg-red-50 text-red-700 hover:border-red-600 hover:bg-red-600 hover:text-white" },
  reset: { icon: "key", style: "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-500 hover:bg-amber-500 hover:text-white" },
} as const;

export function ActionButton({
  variant,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: keyof typeof variants }) {
  const { icon, style } = variants[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`}
    >
      <Icon name={icon} className="size-3.5" />
      {children}
    </button>
  );
}
