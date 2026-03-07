import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  default: "border border-grey-custom text-grey-custom",
  primary: "border border-primary text-primary bg-primary/5",
  accent: "border border-accent text-accent bg-accent/5",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export default function Badge({ className = "", variant = "default", children, ...props }: BadgeProps) {
  const base = "inline-flex items-center text-[10px] px-2 py-0.5 font-medium";
  const combined = `${base} ${variantClasses[variant]} ${className}`.trim();
  return (
    <span className={combined} {...props}>
      {children}
    </span>
  );
}
