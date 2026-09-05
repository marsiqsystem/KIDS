import Link from "next/link";

/** A back chevron and a title. Design 4a's second and third phones. */
export default function TitleBar({ title, back = "/app/sign-in" }: { title: string; back?: string }) {
  return (
    <div className="app-titlebar">
      <Link href={back} className="app-titlebar__back" aria-label="Back">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </Link>
      <h1>{title}</h1>
    </div>
  );
}
