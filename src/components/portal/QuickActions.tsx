"use client";

import { CalendarPlus, Share2, Smartphone } from "lucide-react";
import type { Centre } from "@/lib/centres";

/**
 * Add-to-calendar, share-with-a-parent, save-to-home-screen.
 *
 * All three are built on the phone's own capabilities -- no server, no accounts,
 * nothing to fail. The calendar file is generated in the browser as a data URI
 * so it works offline too.
 */

/** RFC 5545. Reminders the evening before and at 8:00 on the morning. */
function icsFor(centre: Centre, uid: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KIDS//SET 2026//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:set2026-${uid}@kidskolkata.org`,
    "DTSTAMP:20260714T000000Z",
    // 10:00 IST report time = 04:30 UTC; ends 11:30 IST = 06:00 UTC.
    "DTSTART:20260719T043000Z",
    "DTEND:20260719T060000Z",
    "SUMMARY:Students Evaluation Test (SET) 2026",
    `LOCATION:${escapeIcs(`${centre.name}, ${centre.address}`)}`,
    `DESCRIPTION:${escapeIcs(
      `Report by 10:00 AM. Online test 10:30-11:00, written test from 11:30. Bring your printed admit card. Unique ID ${uid}.`,
    )}`,
    // Evening before.
    "BEGIN:VALARM",
    "TRIGGER:-PT14H30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:SET 2026 is tomorrow — charge your phone and find your admit card.",
    "END:VALARM",
    // 08:00 on the day.
    "BEGIN:VALARM",
    "TRIGGER:-PT2H30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:SET 2026 today — report by 10:00 AM.",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

const escapeIcs = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/** Defined at module scope: a component created during render remounts on every
 *  keystroke of the parent, losing focus and state. */
function Btn({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[9px] border border-[var(--cream-muted)] bg-[var(--cream)] px-3.5 py-3 text-left text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--maroon-light)]"
    >
      {icon}
      {children}
    </button>
  );
}

export default function QuickActions({ centre, uid }: { centre: Centre; uid: string }) {
  const downloadIcs = () => {
    const blob = new Blob([icsFor(centre, uid)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SET-2026.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const googleCalendar = () => {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: "Students Evaluation Test (SET) 2026",
      dates: "20260719T043000Z/20260719T060000Z",
      details: `Report by 10:00 AM. Online test 10:30–11:00, written test from 11:30. Bring your printed admit card. Unique ID ${uid}.`,
      location: `${centre.name}, ${centre.address}`,
    });
    window.open(`https://calendar.google.com/calendar/render?${p}`, "_blank", "noopener");
  };

  const shareWithParent = async () => {
    const text = [
      "SET 2026 — exam details",
      "",
      "Sunday, 19 July 2026",
      "Report by 10:00 AM",
      "Online test 10:30–11:00 · Written test from 11:30",
      "",
      `Centre: ${centre.name} (${centre.code})`,
      `Address: ${centre.address}`,
    ].join("\n");

    // The native share sheet lets them pick WhatsApp, SMS, anything. Falls back
    // to WhatsApp directly where it isn't available (older desktop browsers).
    if (navigator.share) {
      try {
        await navigator.share({ title: "SET 2026 — exam details", text });
        return;
      } catch {
        /* dismissed — fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <section className="portal-card flex flex-col gap-2.5 p-5">
      <Btn
        onClick={googleCalendar}
        icon={<CalendarPlus className="h-5 w-5 text-[var(--maroon)]" aria-hidden="true" />}
      >
        Add to Google Calendar
      </Btn>
      <Btn
        onClick={downloadIcs}
        icon={<CalendarPlus className="h-5 w-5 text-[var(--maroon)]" aria-hidden="true" />}
      >
        Download calendar file
      </Btn>
      <Btn
        onClick={shareWithParent}
        icon={<Share2 className="h-5 w-5 text-[var(--teal)]" aria-hidden="true" />}
      >
        Send details to a parent
      </Btn>
      <p className="mt-1 flex items-start gap-2 px-1 text-xs leading-relaxed text-[var(--ink-muted)]">
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          <strong className="text-[var(--ink)]">Tip:</strong> use your browser&apos;s{" "}
          <em>Add to Home screen</em> so you can reopen this page on exam morning without hunting for
          your card.
        </span>
      </p>
    </section>
  );
}
