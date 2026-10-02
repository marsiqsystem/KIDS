import ExcelJS from "exceljs";
import { currentStaff } from "@/lib/admin/session";
import { SHEET_COLUMNS } from "@/lib/admin/questions";

export const dynamic = "force-dynamic";

/**
 * The blank question sheet the Exams tab reads back in.
 *
 * Built here rather than kept as a file so its columns cannot drift from the
 * reader's: both come from SHEET_COLUMNS. The two example rows are arithmetic
 * and geography a child would meet in any book, and name nobody -- a made-up
 * example name has turned out to be a real student before.
 */
export async function GET() {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin" || staff.must_change) {
    return new Response("Not signed in as an admin.", { status: 403 });
  }

  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Questions");
  sheet.columns = SHEET_COLUMNS.map((h) => ({
    header: h,
    key: h,
    width: h === "Question" || h === "Passage" ? 50 : h === "Section" ? 18 : h === "Answer" ? 9 : h === "Image" ? 30 : 22,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  sheet.getColumn("Question").alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn("Passage").alignment = { wrapText: true, vertical: "top" };

  const help = book.addWorksheet("How to fill it");
  help.getColumn(1).width = 100;
  [
    "One question per row on the Questions sheet, starting in row 2.",
    "Question — required. Exactly what the student reads.",
    "A, B, C, D — the options, in order. Use E and F only if a question has more than four. Leave no gaps.",
    "Answer — the letter of the correct option: A, B, C… (1, 2, 3… also works).",
    "Section — optional. A heading the app shows above a group of questions, e.g. Life Science.",
    "Passage — optional. Text shown above the question, for comprehension or data questions.",
    "Image — optional. For a diagram: Insert → Pictures → Place over Cells, and drag the picture so its",
    "    top-left corner sits in that row's Image cell. A picture whose corner sits in an option's cell (A–F)",
    "    becomes that option's picture; the option's text may then be left empty.",
    "    Do NOT use Excel's \"Place in Cell\" — those pictures cannot be read. Make the row tall enough to see it.",
    "    Pictures can also be added afterwards in the control centre, or pasted there as a screenshot.",
    "Bengali text is fine anywhere. Keep the headings in row 1 exactly as they are.",
    "",
    "One sheet per set: e.g. Class X, or Class XI Science, or Class X Bengali medium.",
    "In the control centre: Exams → Write or upload questions → open the set → From an Excel sheet.",
    "Reading the sheet saves nothing. Check the questions on screen, then Save draft, then Check and load.",
    "",
    "Do not email this sheet once it has real questions in it, and never put it in the KIDS GitHub folder.",
  ].forEach((line) => help.addRow([line]));
  help.getRow(1).font = { bold: true };

  // The examples live here, not on the Questions sheet, so a forgotten example
  // can never be read in as question one of a real paper.
  help.addRow([]);
  help.addRow(["Two example rows, as they would look on the Questions sheet:"]).font = { bold: true };
  const ex = book.addWorksheet("Examples");
  ex.columns = sheet.columns.map((c) => ({ header: String(c.header), key: String(c.key), width: c.width }));
  ex.getRow(1).font = { bold: true };
  ex.addRow({ Section: "Mathematics", Question: "What is 7 × 8?", A: "54", B: "56", C: "58", D: "64", Answer: "B" });
  ex.addRow({
    Section: "Geography",
    Question: "Which of these rivers flows through Kolkata?",
    A: "Hooghly",
    B: "Teesta",
    C: "Mahanadi",
    D: "Godavari",
    Answer: "A",
  });
  help.addRow(["See the Examples sheet. It is never read."]);

  const data = await book.xlsx.writeBuffer();
  return new Response(data as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="kids-question-sheet-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
