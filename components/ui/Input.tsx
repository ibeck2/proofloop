import { type InputHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full border border-rule focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink text-graphite bg-paper placeholder-graphite/50 rounded-none";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    const combined = `${baseClass} ${className}`.trim();
    return <input ref={ref} className={combined} {...props} />;
  }
);

Input.displayName = "Input";

export default Input;
