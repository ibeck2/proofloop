import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "outlineMuted" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  // 共有プリミティブなので、トークン名の置き換えだけを行い**色は変えない**。
  // primary は元から紺、secondary/outline は元から深紅で、primary は21箇所で使われている。
  // ここで色を入れ替えると、まだ移行していないページの見た目が一斉に変わってしまう。
  // 深紅を減らすかどうかは、各ページを移行するときにそのページの文脈で判断する。
  primary: "bg-ink text-paper hover:bg-[#001f45] border-0",
  secondary: "bg-seal text-paper hover:bg-[#600000] border-0",
  outline: "bg-paper border border-seal text-seal hover:bg-seal hover:text-paper",
  outlineMuted: "bg-paper border border-rule text-ink hover:border-seal hover:text-seal",
  ghost: "bg-transparent text-graphite hover:text-ink hover:bg-mist",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", type = "button", children, ...props }, ref) => {
    const base = "font-bold transition-colors rounded-none inline-flex items-center justify-center gap-2";
    const combined = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
    return (
      <button ref={ref} type={type} className={combined} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
