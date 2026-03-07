import { type InputHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white placeholder-gray-400 rounded-none";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    const combined = `${baseClass} ${className}`.trim();
    return <input ref={ref} className={combined} {...props} />;
  }
);

Input.displayName = "Input";

export default Input;
