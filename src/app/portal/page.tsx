import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  MapPin,
  Signal,
  BatteryCharging,
  ListChecks,
} from "lucide-react";
import { openPortal, firstName } from "@/lib/exam/portal-auth";
import { EXAM, examPhase } from "@/lib/exam/config";
import { CENTRES, type Centre } from "@/app/set/centres";
import type { Student } from "@/lib/exam/db";
import GetDirections from "@/components/GetDirections";
import PortalShell from "@/components/portal/PortalShell";
import ErrorScreen from "@/components/portal/ErrorScreen";
import Countdown, { WaitingCountdown } from "@/components/portal/Countdown";
import DeviceCheck from "@/components/portal/DeviceCheck";
import Checklist from "@/components/portal/Checklist";
import QuickActions from "@/components/portal/QuickActions";
import Faq from "@/components/portal/Faq";
import "./portal.css";

export const metadata: Metadata = {
  title: "Your Test · SET 2026",
  robots: { index: false, follow: false },
};

// Every scan re-checks the register, and the countdown must be measured now.
export const dynamic = "force-dynamic";

type Search = Promise<{ id?: string; t?: string }>;

export default async function PortalPage({ searchParams }: { searchParams: Search }) {
  const { id = "", t = "" } = await searchParams;
  const gate = await openPortal(id, t);

  if (!gate.ok) return <ErrorScreen reason={gate.reason} uid={gate.uid} />;

  const { student } = gate;
  const centre = CENTRES[student.centre_code.slice(-2)];
  const phase = examPhase();
  const now = new Date().toISOString();
  const name = firstName(student.name);
  const href = `/portal?id=${student.uid}&t=${encodeURIComponent(t)}`;

  if (phase === "over") return <Closed student={student} name={name} />;
  if (phase === "scanning" || phase === "live") {
    return <WaitingRoom student={student} name={name} serverNow={now} />;
  }

  return (
    <PortalShell verifiedAs={name}>
      {/* ---------------------------------------------------------- hero --- */}
      <section className="sky px-5 py-10 sm:px-8 sm:py-14">
        <div className="stars" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 md:grid-cols-[1.2fr_1fr] md:gap-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgb(229_190_122/55%)] bg-[rgb(201_162_75/16%)] py-1.5 pl-2 pr-3.5">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--gold)]">
                <Check className="h-3 w-3 text-[var(--maroon-deep)]" strokeWidth={3.2} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold tracking-[0.04em] text-[#F4E3C4]">
                Admit card verified
              </span>
            </div>

            <h1 className="text-[2.7rem] font-extrabold leading-none tracking-[-0.015em] text-[var(--cream)] sm:text-[4.2rem]">
              Hi {name}!
            </h1>
            <p className="mt-4 max-w-[480px] leading-relaxed text-[#d8e6e2] sm:text-[1.35rem]">
              You&apos;re enrolled and verified. Your test is on{" "}
              <strong className="font-semibold text-white">Sunday, 19 July 2026</strong> — everything
              you need is on this page.
            </p>
          </div>

          <Countdown
            startsAtIso={EXAM.startsAt.toISOString()}
            reportByIso={EXAM.scanOpensAt.toISOString()}
            serverNowIso={now}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- main --- */}
      <div className="bg-[var(--cream)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto grid max-w-[1180px] items-start gap-6 lg:grid-cols-[1fr_372px] lg:gap-7">
          {/* ---- left column ---- */}
          <div className="flex flex-col gap-6">
            <YourTest student={student} />
            <DeviceCheck />

            {/* practice */}
            <section className="portal-card p-5 sm:p-7">
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--maroon-tint)] sm:h-[60px] sm:w-[60px]">
                  <FileText className="h-6 w-6 text-[var(--maroon)] sm:h-7 sm:w-7" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold sm:text-2xl">
                    Try a practice test
                  </h2>
                  <p className="mt-1 max-w-[460px] text-sm leading-relaxed text-[var(--ink-muted)]">
                    Five sample questions in the exact same screen as the real test — same timer, same
                    buttons. So at 10:30, nothing is new. Nothing is recorded.
                  </p>
                </div>
                <Link
                  href={`/portal/practice?id=${student.uid}&t=${encodeURIComponent(t)}`}
                  className="hidden shrink-0 rounded-[10px] border-[1.5px] border-[var(--maroon)] px-7 py-4 font-semibold text-[var(--maroon)] transition hover:bg-[var(--maroon-tint)] sm:block"
                >
                  Start practice test
                </Link>
              </div>
              <Link
                href={`/portal/practice?id=${student.uid}&t=${encodeURIComponent(t)}`}
                className="mt-4 block rounded-[9px] border-[1.5px] border-[var(--maroon)] py-3.5 text-center font-semibold text-[var(--maroon)] sm:hidden"
              >
                Start practice test
              </Link>
            </section>

            <Timeline />
            <Tips />
          </div>

          {/* ---- right rail ---- */}
          <aside className="flex flex-col gap-4.5 lg:sticky lg:top-6">
            <div className="lbl hidden lg:block">At a glance</div>
            {centre && <CentreCard centre={centre} student={student} />}
            <Checklist uid={student.uid} />
            {centre && <QuickActions centre={centre} uid={student.uid} />}
            <HelpCard />
          </aside>
        </div>

        <div className="mx-auto mt-6 max-w-[1180px]">
          <Faq />
        </div>

        <p className="mx-auto mt-6 max-w-[1180px] text-center text-xs leading-relaxed text-[var(--ink-muted)]">
          Keep your admit card safe — you will scan this QR code again on exam day.{" "}
          <Link href={href} className="underline underline-offset-2">
            This page
          </Link>{" "}
          is yours alone.
        </p>
      </div>
    </PortalShell>
  );
}

/* ------------------------------------------------------------ sections --- */

function YourTest({ student }: { student: Student }) {
  return (
    <section className="portal-card overflow-hidden p-0">
      <div className="flex items-center gap-2.5 bg-[image:var(--gradient-maroon)] px-5 py-3.5 sm:px-7 sm:py-4">
        <FileText className="h-5 w-5 text-[var(--gold-light)]" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--cream)] sm:text-xl">
          Your test
        </h2>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--maroon-light)] bg-[var(--cream)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div>
            <div className="lbl">Unique ID</div>
            <div className="mono tnum mt-0.5 text-2xl font-semibold tracking-[0.06em] text-[var(--maroon)] sm:text-3xl">
              {student.uid}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="lbl">Class</div>
              <div className="mt-0.5 text-xl font-semibold sm:text-2xl">
                {student.class}
                {student.stream && (
                  <span className="ml-1.5 text-sm font-medium text-[var(--ink-muted)]">
                    {student.stream}
                  </span>
                )}
              </div>
            </div>
            <span className="hidden max-w-[130px] text-xs leading-snug text-[var(--ink-muted)] sm:block">
              Read this ID aloud to a teacher if they ask.
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Tile label="Online window" value="10:30 – 11:00 AM" sub={`${EXAM.questionCount} questions · ${EXAM.durationMinutes} minutes`} />
          <Tile label="Report by" value="10:00 AM" sub={student.school_name} />
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--maroon-tint)] px-4 py-3.5 sm:items-center sm:px-5">
          <span className="text-[var(--maroon)]" aria-hidden="true">
            ★
          </span>
          <p className="text-sm leading-relaxed text-[#5e1420] sm:text-base">
            <strong className="font-bold">Your paper unlocks at 10:30 sharp</strong> and can be taken{" "}
            <strong className="font-bold">once only.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-4 py-3.5">
      <div className="lbl">{label}</div>
      <div className="tnum mt-0.5 text-lg font-semibold sm:text-xl">{value}</div>
      <div className="mt-0.5 text-xs leading-snug text-[var(--ink-muted)]">{sub}</div>
    </div>
  );
}

function CentreCard({ centre, student }: { centre: Centre; student: Student }) {
  // A student usually sits somewhere other than their own school. Say so, rather
  // than letting them assume and turn up at the wrong building.
  const elsewhere = centre.name.trim() !== student.school_name.trim();

  return (
    <section className="portal-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
          <MapPin className="h-4.5 w-4.5 text-[var(--maroon)]" aria-hidden="true" />
          Your test centre
        </h2>
        <span className="shrink-0 rounded-md bg-[rgb(30_158_140/12%)] px-2 py-1 text-[0.62rem] font-bold tracking-[0.08em] text-[var(--teal)]">
          {centre.code}
        </span>
      </div>

      <div className="lbl">{centre.district}</div>
      <div className="mt-0.5 font-semibold leading-snug">{centre.name}</div>
      <address className="mt-1.5 text-sm not-italic leading-relaxed text-[var(--ink-muted)]">
        {centre.address}
      </address>

      <div className="mt-4">
        <GetDirections centre={centre} />
      </div>

      {elsewhere && (
        <p className="mt-3 rounded-lg bg-[var(--maroon-tint)] px-3 py-2 text-xs leading-relaxed text-[#5e1420]">
          Note: your centre is <strong>not</strong> your own school. You sit at the building named
          above.
        </p>
      )}

      <p className="mt-3 border-t border-[var(--cream-muted)] pt-3 text-xs leading-relaxed text-[var(--ink-muted)]">
        <strong className="text-[var(--ink)]">19 July is a Sunday</strong> — trains and buses run a
        different timetable. Plan ahead.
      </p>
    </section>
  );
}

function Timeline() {
  const steps = [
    { time: "BY 10:00", body: <>Reach your centre and settle in.</> },
    { time: "10:30 – 11:00", body: <>Online test on your phone — {EXAM.questionCount} questions.</> },
    {
      time: "11:00",
      gold: true,
      body: (
        <>
          <strong className="font-semibold">Auto-submitted at 11:00</strong> even if you don&apos;t
          press Submit. Phones collected.
        </>
      ),
    },
    { time: "FROM 11:30", body: <>Written offline test begins.</> },
  ];

  return (
    <section className="portal-card p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2.5 font-[family-name:var(--font-display)] text-xl font-bold">
        <Clock className="h-5 w-5 text-[var(--maroon)]" aria-hidden="true" />
        What happens on exam day
      </h2>

      <ol className="relative grid gap-5 sm:grid-cols-4 sm:gap-4">
        <div
          className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-[var(--cream-muted)] sm:left-[12%] sm:right-[12%] sm:top-[11px] sm:bottom-auto sm:h-0.5 sm:w-auto"
          aria-hidden="true"
        />
        {steps.map((s, i) => (
          <li key={s.time} className="relative pl-8 sm:pl-0 sm:text-center">
            <span
              className={`absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold sm:relative sm:mx-auto sm:h-6 sm:w-6 sm:text-xs ${
                s.gold
                  ? "bg-[var(--gold)] text-[var(--maroon-deep)]"
                  : "border-2 border-[var(--maroon)] bg-[var(--cream)] text-[var(--maroon)]"
              }`}
            >
              {i + 1}
            </span>
            <div
              className={`tnum text-[0.7rem] font-bold tracking-[0.04em] sm:mt-2.5 ${s.gold ? "text-[#8a6d1f]" : "text-[var(--maroon)]"}`}
            >
              {s.time}
            </div>
            <p className="mt-0.5 text-sm leading-snug">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-3 rounded-xl bg-[rgb(30_158_140/10%)] px-4 py-3.5 sm:px-5">
        <Check className="h-5 w-5 shrink-0 text-[var(--teal)]" strokeWidth={2} aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[var(--teal-ink)] sm:text-base">
          <strong className="font-bold">You can change any answer</strong> right up until you submit.
          Nothing is locked in.
        </p>
      </div>
    </section>
  );
}

function Tips() {
  const tips = [
    { icon: <BatteryCharging className="h-5 w-5" />, text: <>Charge your phone fully the night before.</> },
    {
      icon: <Signal className="h-5 w-5" />,
      text: (
        <>
          Mobile data <strong>or</strong> Wi-Fi both work. If the signal drops, the test keeps
          running.
        </>
      ),
    },
    {
      icon: <Clock className="h-5 w-5" />,
      text: (
        <>
          About <strong>35 seconds a question</strong> — skip hard ones and come back.
        </>
      ),
    },
    { icon: <ListChecks className="h-5 w-5" />, text: <>Attempt everything — answer even when unsure.</> },
  ];

  return (
    <section className="portal-card p-5 sm:p-7">
      <h2 className="mb-4 flex items-center gap-1.5 text-[0.64rem] font-bold uppercase tracking-[0.08em] text-[var(--maroon)]">
        <span className="text-[var(--gold)]" aria-hidden="true">
          ★
        </span>
        Before you go
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-x-7">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[var(--maroon)]" aria-hidden="true">
              {tip.icon}
            </span>
            <p className="text-sm leading-relaxed">{tip.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HelpCard() {
  return (
    <section className="portal-card bg-[linear-gradient(180deg,#FBF7EF,#F6EFE2)] p-5">
      <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <HelpCircle className="h-4.5 w-4.5 text-[var(--maroon)]" aria-hidden="true" />
        If you need help
      </h2>
      <p className="text-sm leading-relaxed">
        You will not be stranded. A KIDS coordinator will be at your centre on the day. Before then,
        speak to your <strong className="font-semibold">Head of School</strong> or the{" "}
        <strong className="font-semibold">KIDS office</strong> at kids.kol.org2003@gmail.com.
      </p>
    </section>
  );
}

/* --------------------------------------------------------------- states --- */

function WaitingRoom({
  student,
  name,
  serverNow,
}: {
  student: Student;
  name: string;
  serverNow: string;
}) {
  return (
    <div className="portal sky flex min-h-screen flex-col px-6 py-6">
      <div className="stars" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fdccb]">
          Your test begins at 10:30
        </div>

        <WaitingCountdown startsAtIso={EXAM.startsAt.toISOString()} serverNowIso={serverNow} />

        <div className="text-xs uppercase tracking-[0.24em] text-[#bcd0cc]">minutes · seconds</div>

        <div className="mt-10 w-full max-w-md rounded-2xl border border-[rgb(229_190_122/25%)] bg-[rgb(12_42_46/50%)] px-5 py-4">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#e9d9be]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--star-gold)] shadow-[0_0_0_3px_rgb(244_193_42/25%)]" />
            Preparing your paper…
          </div>
          <p className="text-sm leading-relaxed text-[#a9c3be]">
            Stay on this page and keep it open. Don&apos;t close or refresh — your test will open
            here by itself.
          </p>
        </div>
      </div>

      <div className="relative pt-5 text-center text-xs text-[#8fb0aa]">
        {name} · ID <span className="tnum">{student.uid}</span> · {student.centre_code}
      </div>
    </div>
  );
}

function Closed({ student, name }: { student: Student; name: string }) {
  return (
    <PortalShell verifiedAs={name}>
      <div className="sky px-6 py-12 text-center">
        <div className="stars" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[var(--gold)] shadow-[0_0_0_8px_rgb(201_162_75/18%)]">
            <Check className="h-9 w-9 text-[var(--maroon-deep)]" strokeWidth={2.6} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-[var(--cream)] sm:text-[2.7rem]">
            Your test is submitted
          </h1>
          <p className="mt-3 text-[#d8e6e2] sm:text-lg">
            Well done, {name} — the online part is complete.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl gap-5 px-5 py-10 sm:grid-cols-2 sm:px-8">
        <section className="portal-card flex items-start gap-3.5 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--maroon-tint)]">
            <ClipboardList className="h-5 w-5 text-[var(--maroon)]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Now: the written test
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              The offline written test begins at{" "}
              <strong className="tnum text-[var(--ink)]">11:30 AM</strong>. Go to your room — an
              invigilator will guide you.
            </p>
          </div>
        </section>

        <section className="portal-card flex items-start gap-3.5 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(30_158_140/12%)]">
            <Clock className="h-5 w-5 text-[var(--teal)]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Results, later
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              Your result will be published on this same page. You can safely close it now and come
              back.
            </p>
          </div>
        </section>

        <p className="col-span-full text-center text-xs text-[var(--ink-muted)]">
          {name} · ID <span className="tnum">{student.uid}</span>
        </p>
      </div>
    </PortalShell>
  );
}
