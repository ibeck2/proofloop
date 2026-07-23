import { type TextareaHTMLAttributes, forwardRef } from "react";

const baseClass =
  "w-full border border-rule focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink text-graphite bg-paper placeholder-graphite/50 rounded-none resize-none";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    const combined = `${baseClass} ${className}`.trim();
    return <textarea ref={ref} className={combined} {...props} />;
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
