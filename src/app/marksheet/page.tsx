/**
 * The printable Statement of Marks, rebuilt on demand.
 *
 *   /marksheet?id=<uid>&t=<token>
 *
 * The same A4 the office printed (Desktop\SET 2026 Marksheets), rendered from
 * the database instead of served as a stored file. Three reasons it is done
 * this way rather than by uploading 7,287 PDFs somewhere:
 *
 *   * it cannot drift. The marks on this page are the marks that were
 *     published, because they are read from the same row the result page reads.
 *     A stored PDF made before a correction would quietly disagree.
 *   * nothing is hosted. No third party holds a folder of children's
 *     marksheets, and there is no permanent link to leak.
 *   * it is instant. No Chromium, no PDF library, no cold start — this is HTML
 *     and inline SVG, so it loads like any other page, including on a cheap
 *     phone on a slow connection.
 *
 * The student saves it with their browser's own print-to-PDF, which every
 * desktop and mobile browser has. The stylesheet is `@page A4` with zero
 * margins, so what they get is the same sheet, to the millimetre.
 *
 * The gate is the same one the portal uses: a signature over the Unique ID,
 * checked BEFORE the database is touched, so an unsigned request cannot even be
 * used to probe which IDs exist. And it renders nothing at all until the
 * written paper's results are actually published.
 */
import type { Metadata } from "next";
import { openPortal } from "@/lib/exam/portal-auth";
import { findOfflineMarksheet, offlinePublicationState } from "@/lib/exam/offline-results";
import { qrSvg } from "@/lib/qr-svg";
import { PrintButton } from "./print-button";
import { signUid, qrSecret } from "@/lib/qr-token";
import "./marksheet.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statement of Marks — SET 2026",
  robots: { index: false, follow: false },
};

const GLYPH: Record<string, string> = {
  correct: "✓", wrong: "✗", blank: "–", double: "✗", grace: "G",
};

export default async function MarksheetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; t?: string }>;
}) {
  const { id = "", t = "" } = await searchParams;

  const gate = await openPortal(id, t);
  if (!gate.ok) return <Refused />;

  const { published } = await offlinePublicationState();
  if (!published) return <Refused notYet />;

  const sheet = await findOfflineMarksheet(gate.student);
  if (!sheet) return <Refused absent name={gate.student.name} />;

  const s = gate.student;
  const issued = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  // The candidate's own verification link — the very one printed on their admit
  // card. Regenerated from the secret rather than stored, and verified against
  // the printed tokens before this route was written.
  const link = `https://www.kidskolkata.org/portal?id=${s.uid}&t=${signUid(s.uid, qrSecret())}`;

  // Four columns of 25. For XI and XII those columns are exactly English & GK
  // and the three chosen subjects, so they can be named; for IX and X the seven
  // sections cut across them, so they are left numbered.
  const cols = [0, 1, 2, 3].map((i) => ({ first: i * 25 + 1, last: i * 25 + 25 }));
  const named = sheet.sections.length === 4
    && sheet.sections.every((sec, i) => sec.first === cols[i].first && sec.last === cols[i].last);

  return (
    <>
      <div className="toolbar no-print">
        <span>
          Your Statement of Marks. Use <b>Print</b> and choose <b>Save as PDF</b>.
        </span>
        <PrintButton />
      </div>

      <section className="sheet">
        <header className="band">
          <div className="mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kids-icon.png" alt="KIDS" />
          </div>
          <div>
            <div className="wordmark">KIDS</div>
            <div className="instname">KABITIRTHA INSTITUTE OF DEVELOPMENT &amp; STUDIES</div>
            <div className="tagline">A mission of excellence in education</div>
          </div>
          <div className="band-right">
            <div className="est">ESTD 2003 · KOLKATA</div>
            <div className="reg">REG. NO. S/1L/19796</div>
            <div className="star">★★★</div>
          </div>
        </header>
        <div className="goldbar" />

        <div className="titlestrip">
          <h1>Student Evaluation Test (SET) 2026 — Statement of Marks</h1>
          <p>Project UDAAN · Written paper, 19 July 2026</p>
        </div>

        <div className="pad">
          <div className="cols">
            <div>
              <Sec>Candidate</Sec>
              {/* four rows, not six: the sheet has to hold a seven-row table
                  underneath and still leave the footer its place. */}
              <dl className="identity">
                <Field label="Name of Candidate" value={s.name} wide serif />
                <Field label="Class" value={sheet.class + (sheet.stream ? ` · ${sheet.stream}` : "")} />
                <Field label="Unique ID" value={s.uid} mono />
                <Field label="School" value={s.school_name} wide />
                <Field label="Exam Centre" value={s.centre_name} />
                <Field label="Date of Issue" value={issued} />
              </dl>

              <Sec top>Performance Summary</Sec>
              <table>
                {/* the numeric columns are fixed so the subject column takes
                    every millimetre left over — without this "Grand Total"
                    collides with the 100 beside it, and "Physical Science"
                    wraps onto two lines on every IX/X sheet. */}
                <colgroup>
                  <col />
                  <col className="n" /><col className="n" /><col className="n" />
                  <col className="n" /><col className="n" /><col className="pc" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Subject</th><th>Ques.</th><th>Correct</th><th>Incor.</th>
                    <th>Unatt.</th><th>Marks</th><th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.sections.map((sec) => (
                    <tr key={sec.name}>
                      <td>{sec.name}</td>
                      <td>{sec.total}</td>
                      <td>{sec.correct}</td>
                      <td>{sec.wrong}</td>
                      <td>{sec.blank}</td>
                      <td className="marks">{sec.marks}</td>
                      <td>{sec.percent}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Grand Total</td>
                    <td>{sheet.total}</td>
                    <td>{sheet.correct}</td>
                    <td>{sheet.wrong}</td>
                    <td>{sheet.blank}</td>
                    <td>{sheet.marks} / {sheet.total}</td>
                    <td>{sheet.percent}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <div className="panel">
                <div
                  className="qrwrap"
                  dangerouslySetInnerHTML={{ __html: qrSvg(link, "qr") }}
                />
                <div className="cap">Scan for your detailed<br />analysis &amp; solutions</div>
                <div className="uidlabel">Unique ID</div>
                <div className="uidbox"><span>{s.uid}</span></div>
              </div>

              <div className="score">
                <div className="lbl">Aggregate</div>
                <div className="big">{sheet.percent}<sup>%</sup></div>
                <div className="of">{sheet.marks} <small>/ {sheet.total}</small></div>
              </div>
            </div>
          </div>

          <Sec top>Response Overview</Sec>
          <div className="strip">
            <div><div className="n">{sheet.correct}</div><div className="k">Correct</div></div>
            <div><div className="n">{sheet.wrong}</div><div className="k">Wrong</div></div>
            <div><div className="n">{sheet.blank}</div><div className="k">Unattempted</div></div>
          </div>

          <div className="note">
            <p>
              <b>How marks are computed.</b> One mark is awarded for each correct response.
              There is <b>no negative marking</b>; unattempted responses carry no penalty.
              A question with two bubbles filled scores nothing, like any wrong answer.
              {sheet.grace > 0 && (
                <> {sheet.grace === 1 ? "One question was" : `${sheet.grace} questions were`} withdrawn
                  and awarded to every candidate; {sheet.grace === 1 ? "it is" : "they are"} counted
                  inside Correct above.</>
              )}
            </p>
            <p>
              <b>Source of these marks.</b> Every figure above is derived directly from the
              assessed OMR sheet of the candidate. The question-by-question reproduction of
              that sheet is published overleaf for verification.
            </p>
          </div>
        </div>

        <footer className="foot">
          <div className="disc">
            Computer-generated statement — verify via the QR / Unique ID.
            Marks provisional, subject to KIDS review.
          </div>
          <div className="sig">
            {/* The signature is part of the document, not decoration — the
                printed sheets carry it and a marksheet without it does not
                look issued by anyone. */}
            <div className="line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sig-general-secretary.png" alt="" aria-hidden />
            </div>
            <div className="nm">MD. RIZWAN</div>
            <div className="ro">Gen. Secretary</div>
          </div>
        </footer>
      </section>

      {/* ── page two — the sheet itself ─────────────────────────────── */}
      <section className="sheet annex">
        <header className="slimband">
          <div className="mk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kids-icon.png" alt="KIDS" />
          </div>
          <div>
            <div className="t">Annexure — Response Analysis</div>
            <div className="s">SET 2026 · Reproduction of the assessed OMR</div>
          </div>
          <div className="r">
            <div>{s.name}</div>
            <div><b>UID</b> {s.uid}</div>
          </div>
        </header>
        <div className="goldbar thin" />

        <div className="pad">
          <div className="legend">
            <Legend fill="#1E9E8C" glyph="✓" text="Correct — solid" />
            <Legend fill="#B22234" glyph="✗" text="Wrong — marked solid, key ringed" />
            <Legend dashed glyph="–" text="Unattempted — key ringed" />
            <Legend two glyph="✗" text="Two bubbles filled — scored as wrong" />
            <Legend fill="#C9A24B" glyph="G" text="Grace — awarded to everyone" />
            <div className="item counts">
              Correct <b>{sheet.correct}</b> · Wrong <b>{sheet.wrong}</b> ·
              Unattempted <b>{sheet.blank}</b>
            </div>
          </div>

          <div className="qheads">
            {cols.map((c, i) => (
              <div key={c.first}>
                {named ? sheet.sections[i].name : `Q${c.first} – ${c.last}`}
              </div>
            ))}
          </div>

          <div className="qgrid">
            {sheet.questions.map((q) => (
              <div
                key={q.n}
                className={`q s-${q.status}`}
                data-m={q.marked ?? ""}
                data-m2={q.second ?? ""}
                data-c={q.key ?? ""}
              >
                <span className="qn">{q.n}</span>
                <svg className="bb" viewBox="0 0 48 12" shapeRendering="geometricPrecision">
                  {["a", "b", "c", "d"].map((opt, i) => (
                    <g key={opt} data-opt={opt}>
                      <circle cx={6 + i * 12} cy="6" r="4.4" />
                      <text x={6 + i * 12} y="7.9">{opt}</text>
                    </g>
                  ))}
                </svg>
                <span className="gl">{GLYPH[q.status]}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="annexfoot">
          <div className="disc">
            Kabitirtha Institute of Development &amp; Studies · Reg. S/1L/19796<br />
            Computer-generated — marks provisional, subject to KIDS review.
          </div>
          <div className="sig">
            <div className="line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sig-chief-controller.png" alt="" aria-hidden />
            </div>
            <div className="nm">CHIEF CONTROLLER</div>
            <div className="ro">Student Evaluation Test</div>
          </div>
        </footer>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── pieces ─── */

function Sec({ children, top }: { children: React.ReactNode; top?: boolean }) {
  return (
    <div className={`sec${top ? " top" : ""}`}>
      <span className="dot">★</span>
      <h2>{children}</h2>
      <span className="rule" />
    </div>
  );
}

function Field({
  label, value, wide, serif, mono,
}: { label: string; value: string; wide?: boolean; serif?: boolean; mono?: boolean }) {
  return (
    <div className={`f${wide ? " span" : ""}`}>
      <div className="l">{label}</div>
      <div className={`v${serif ? " serif" : ""}${mono ? " mono" : ""}`}>{value}</div>
    </div>
  );
}

function Legend({
  fill, dashed, two, glyph, text,
}: { fill?: string; dashed?: boolean; two?: boolean; glyph: string; text: string }) {
  return (
    <div className="item">
      <svg width="5mm" height="5mm" viewBox="0 0 12 12" aria-hidden>
        {two ? (
          <>
            <circle cx="4" cy="6" r="3.4" fill="#B22234" />
            <circle cx="9.4" cy="6" r="3.4" fill="#B22234" />
          </>
        ) : dashed ? (
          <circle cx="6" cy="6" r="4.4" fill="#fff" stroke="#9A9086"
            strokeWidth=".9" strokeDasharray="1.6 1.4" />
        ) : (
          <circle cx="6" cy="6" r="4.6" fill={fill} />
        )}
      </svg>
      <span><b>{glyph}</b> {text}</span>
    </div>
  );
}

function Refused({
  notYet, absent, name,
}: { notYet?: boolean; absent?: boolean; name?: string }) {
  return (
    <div className="refused">
      <h1>
        {notYet ? "Not published yet"
          : absent ? "No marksheet to show"
          : "This link is not valid"}
      </h1>
      <p>
        {notYet
          ? "The written paper's results have not been declared. Your marksheet will be here as soon as they are — keep this link."
          : absent
          ? `Our records show ${name ?? "you"} did not sit the written paper on 19 July 2026, so there is nothing to mark. If that is wrong, tell your school co-ordinator.`
          : "Open your result from the QR code on your admit card, or check the Unique ID."}
      </p>
    </div>
  );
}
