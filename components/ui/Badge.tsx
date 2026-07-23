import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  default: "border border-rule text-graphite",
  // primary と accent を同じにすると、2種類あるはずのバリアントが見分けられなくなる。
  // 元の色（primary=紺 / accent=深紅）をトークンに置き換えるだけにとどめる。
  primary: "border border-ink text-ink bg-ink/5",
  accent: "border border-seal text-seal bg-seal/5",
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
