import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export default function Button({ variant = "ghost", className = "", ...props }: Props) {
  const look =
    variant === "primary"
      ? "border-accent/70 bg-accent/10 text-accent hover:bg-accent/20"
      : "border-line bg-card text-body hover:border-accent/60 hover:bg-card-hover hover:text-accent";
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-mono text-sm transition duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 ${look} ${className}`}
    />
  );
}
