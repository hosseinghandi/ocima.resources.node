import { useState, type InputHTMLAttributes } from "react";

/** Password field with an eye button that reveals or hides the text. */
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const margin = className.match(/(?:^|\s)(mt-\d+)(?=\s|$)/)?.[1] ?? "";
  const inputClass = className.replace(/(?:^|\s)mt-\d+(?=\s|$)/, "");
  return (
    <div className={`relative ${margin}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Nascondi password" : "Mostra password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-muted hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 6.1A10.5 10.5 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3.2 3.7M6.6 6.7A16 16 0 0 0 3 12s4 6 9 6c1.5 0 2.9-.4 4.1-1" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
