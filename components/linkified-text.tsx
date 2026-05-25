"use client";

const URL_REGEX = /(\bhttps?:\/\/[^\s<>"')\]]+)/g;

export function LinkifiedText({
  text,
  className
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent underline underline-offset-2 hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
}
