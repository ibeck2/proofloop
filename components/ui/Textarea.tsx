import { type TextareaHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-800 bg-white placeholder-gray-400 rounded-none resize-none";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    const combined = `${baseClass} ${className}`.trim();
    return <textarea ref={ref} className={combined} {...props} />;
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
