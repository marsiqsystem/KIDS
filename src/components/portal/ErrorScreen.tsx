import { Link2Off, Search, ShieldAlert, ClipboardList } from "lucide-react";
import PortalShell from "./PortalShell";

/**
 * The four ways in can fail.
 *
 * These are what a panicking student sees, so none of them is a red box. Each
 * one names plainly what happened, never blames the child, and always ends with
 * something they can actually do next.
 */
type Reason = "incomplete" | "bad_signature" | "not_found" | "no_class";

const SCREENS: Record<
  Reason,
  {
    icon: React.ReactNode;
    tint: string;
    title: string;
    body: React.ReactNode;
    action: React.ReactNode;
    footer?: React.ReactNode;
  }
> = {
  incomplete: {
    icon: <Link2Off className="h-7 w-7" />,
    tint: "bg-[rgb(201_162_75/16%)] text-[#8a6d1f]",
    title: "This link is missing your code",
    body: (
      <>
        The portal needs the personal code printed with your QR to know who you are — and it
        isn&apos;t in this link.
      </>
    ),
    action: (
      <>
        Open your admit card and <strong>scan the QR again</strong> from the card itself. That link
        carries your code.
      </>
    ),
    footer: <>Still stuck? Speak to your Head of School or the KIDS office.</>,
  },
  bad_signature: {
    icon: <ShieldAlert className="h-7 w-7" />,
    tint: "bg-[var(--maroon-tint)] text-[var(--maroon)]",
    title: "We couldn't verify this code",
    body: (
      <>
        For everyone&apos;s security, each admit-card QR only works when it is scanned from the{" "}
        <strong>original card</strong>.
      </>
    ),
    action: (
      <>
        Scan the <strong>printed admit card</strong> directly. If you are scanning a photo of it,
        scan the card itself instead.
      </>
    ),
    footer: <>If your card will not scan, show this screen to your Head of School.</>,
  },
  not_found: {
    icon: <Search className="h-7 w-7" />,
    tint: "bg-[rgb(30_158_140/12%)] text-[var(--teal)]",
    title: "We can't find this ID",
    body: <>This ID isn&apos;t on our register. It is usually a small typo somewhere in the link.</>,
    action: (
      <>
        Check the 9-digit ID on your admit card and scan the QR again. If it is correct, show this
        screen to your school coordinator.
      </>
    ),
  },
  no_class: {
    icon: <ClipboardList className="h-7 w-7" />,
    tint: "bg-[rgb(201_162_75/16%)] text-[#8a6d1f]",
    title: "We're missing your class",
    body: (
      <>
        We have your record, but not which class you are in. The test paper is chosen by class, so we
        cannot open the right one until it is added.
      </>
    ),
    action: (
      <>
        Show this screen to your <strong>school coordinator</strong> before exam day so they can add
        your class. Please do it early — it cannot be fixed at the centre on the morning.
      </>
    ),
  },
};

export default function ErrorScreen({ reason, uid }: { reason: Reason; uid: string }) {
  const s = SCREENS[reason];
  // Only show an ID we actually received and that is worth reading back.
  const showId = uid.length === 9 && (reason === "not_found" || reason === "no_class");

  return (
    <PortalShell>
      <main className="mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_340px]">
          <div>
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${s.tint}`}
              aria-hidden="true"
            >
              {s.icon}
            </span>

            <h1 className="mt-5 text-2xl font-bold leading-tight sm:text-[2.4rem]">{s.title}</h1>

            <p className="mt-3.5 max-w-[460px] leading-relaxed text-[var(--ink-muted)] sm:text-lg">
              {s.body}
            </p>

            <div className="portal-card mt-6 max-w-[480px] p-5">
              <div className="lbl mb-2">What to do</div>
              <p className="leading-relaxed">{s.action}</p>
            </div>

            {s.footer && (
              <p className="mt-5 text-sm leading-relaxed text-[var(--ink-muted)]">{s.footer}</p>
            )}
          </div>

          {showId && (
            <div className="rounded-2xl bg-[image:var(--gradient-maroon)] px-6 py-7 text-center">
              <div className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[var(--gold-light)]">
                {reason === "no_class" ? "Show this ID to your coordinator" : "ID we received"}
              </div>
              <div className="mono tnum my-3 text-3xl tracking-[0.08em] text-[var(--cream)] sm:text-[2.4rem]">
                {uid}
              </div>
            </div>
          )}
        </div>
      </main>
    </PortalShell>
  );
}
