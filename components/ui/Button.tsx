import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "outlineMuted" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-[#001f45] border-0",
  secondary: "bg-accent text-white hover:bg-accent/90 border-0",
  outline: "bg-white border border-accent text-accent hover:bg-accent hover:text-white",
  outlineMuted: "bg-white border border-grey-custom/20 text-navy hover:border-accent hover:text-accent",
  ghost: "bg-transparent text-text-grey hover:text-primary hover:bg-slate-50",
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
