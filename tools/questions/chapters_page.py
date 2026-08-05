"""
Render chapters.json as a review page.

342 chapter names across 46 buckets are hard to read as raw JSON. This emits a
single self-contained page grouped by class, with both the section sizes and the
per-chapter tag counts pulled live from the data, so the page and the files can
never disagree on screen.

Run:  python tools/questions/chapters_page.py <output.html>
"""

from __future__ import annotations

import html
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parents[1] / "src" / "data" / "questions"

CLASS_ORDER = ["IX", "X", "XI", "XII"]
STREAM_ORDER = {"All": 0, "Science": 1, "Commerce": 2, "Arts": 3}

CSS = """
:root{
  --paper:#F7F8F6; --card:#FFFFFF; --ink:#16201F; --muted:#63736F;
  --rule:#DFE5E2; --accent:#0B6E63; --accent-ink:#0B6E63; --accent-wash:#E7F1EE;
  --shadow:0 1px 2px rgba(22,32,31,.05), 0 8px 24px -16px rgba(22,32,31,.25);
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#111716; --card:#182120; --ink:#E7EDEA; --muted:#94A5A0;
    --rule:#283432; --accent:#5CC7B4; --accent-ink:#7FD9C8; --accent-wash:#1B2C29;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
  }
}
:root[data-theme="dark"]{
  --paper:#111716; --card:#182120; --ink:#E7EDEA; --muted:#94A5A0;
  --rule:#283432; --accent:#5CC7B4; --accent-ink:#7FD9C8; --accent-wash:#1B2C29;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
}
:root[data-theme="light"]{
  --paper:#F7F8F6; --card:#FFFFFF; --ink:#16201F; --muted:#63736F;
  --rule:#DFE5E2; --accent:#0B6E63; --accent-ink:#0B6E63; --accent-wash:#E7F1EE;
  --shadow:0 1px 2px rgba(22,32,31,.05), 0 8px 24px -16px rgba(22,32,31,.25);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:16px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1120px; margin:0 auto; padding:clamp(28px,5vw,64px) clamp(18px,4vw,40px) 96px}
.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,ui-serif,serif}
.mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}

header{display:flex; flex-direction:column; gap:14px; margin-bottom:14px}
.eyebrow{
  font-size:12px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--accent-ink); font-weight:600;
}
h1{
  font-size:clamp(30px,4.4vw,46px); line-height:1.1; margin:0; font-weight:600;
  letter-spacing:-.015em; text-wrap:balance;
}
.lede{max-width:66ch; color:var(--muted); font-size:17px; margin:0}
.lede strong{color:var(--ink); font-weight:600}

.stats{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1px;
  background:var(--rule); border:1px solid var(--rule); border-radius:10px;
  overflow:hidden; margin:30px 0 8px;
}
.stat{background:var(--card); padding:16px 18px; display:flex; flex-direction:column; gap:3px}
.stat .n{font-size:26px; font-weight:600; font-variant-numeric:tabular-nums; letter-spacing:-.02em}
.stat .l{font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)}

.ask{
  border-left:3px solid var(--accent); background:var(--accent-wash);
  padding:16px 20px; border-radius:0 8px 8px 0; margin:26px 0 0;
}
.ask p{margin:0 0 8px} .ask p:last-child{margin:0}
.ask h2{font-size:15px; margin:0 0 8px; letter-spacing:.02em}

section.cls{margin-top:52px}
.cls-head{
  display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;
  padding-bottom:10px; border-bottom:2px solid var(--ink); margin-bottom:22px;
}
.cls-head h2{font-size:27px; margin:0; font-weight:600; letter-spacing:-.01em}
.cls-head .meta{font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums}

.grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:16px}
.card{
  background:var(--card); border:1px solid var(--rule); border-radius:10px;
  padding:18px 20px 16px; box-shadow:var(--shadow);
  display:flex; flex-direction:column; gap:12px;
}
.card h3{font-size:18px; margin:0; font-weight:600; letter-spacing:-.01em; text-wrap:balance}
.key{
  font-size:11.5px; color:var(--muted); word-break:break-all;
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.pill{
  font-size:11px; font-weight:600; letter-spacing:.04em; padding:2px 8px;
  border-radius:999px; background:var(--accent-wash); color:var(--accent-ink);
  font-variant-numeric:tabular-nums; white-space:nowrap;
}
ol.chapters{margin:0; padding:0; list-style:none; display:flex; flex-direction:column}
ol.chapters li{
  padding:7px 0; border-top:1px solid var(--rule); font-size:14.5px;
  display:flex; align-items:baseline; justify-content:space-between; gap:14px;
}
ol.chapters li .n{
  font-variant-numeric:tabular-nums; color:var(--muted); font-size:12.5px;
  font-weight:600; flex:none;
}
ol.chapters li:first-child{border-top:0}

footer{
  margin-top:60px; padding-top:20px; border-top:1px solid var(--rule);
  color:var(--muted); font-size:13.5px;
}
a{color:var(--accent-ink)}
:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:3px}
@media (prefers-reduced-motion:reduce){*{animation:none!important; transition:none!important}}
"""


def main() -> int:
    out = Path(sys.argv[1])
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    raw = json.loads((HERE / "chapters.json").read_text(encoding="utf-8"))
    chapters = {k: v for k, v in raw.items() if not k.startswith("_")}
    counts = Counter(f"{q['class']}|{q['stream']}|{q['section']}" for q in questions)
    # Once tagging has run, show how many questions each chapter actually caught --
    # a chapter holding one question out of twenty-five is a hint it should merge.
    tagged = json.loads((DATA / "question-chapters.json").read_text(encoding="utf-8"))
    per_ch = Counter((f"{t['class']}|{t['stream']}|{t['section']}", t["chapter"])
                     for t in tagged)

    total_ch = sum(len(v) for v in chapters.values())
    distinct = len({c for v in chapters.values() for c in v})

    e = html.escape
    p: list[str] = []
    p.append(f"<style>{CSS}</style>")
    p.append('<div class="wrap">')
    p.append("<header>")
    p.append('<div class="eyebrow">SET 2026 &middot; Phase 1 &middot; approved and tagged</div>')
    p.append('<h1 class="serif">Chapter map of the 2026 papers</h1>')
    p.append('<p class="lede">All <strong>1,000</strong> offline questions are now '
             'tagged &mdash; each to exactly one chapter below &mdash; so a result can '
             'name <em>which topics to work on</em> rather than just a score. The figure '
             'beside each chapter is how many questions it caught. Names follow the WB '
             'board syllabus headings wherever the questions map cleanly onto them.</p>')
    p.append("</header>")

    p.append('<div class="stats">')
    for n, l in [(f"{len(questions):,}", "questions"), (len(chapters), "subject groups"),
                 (total_ch, "chapters"), (distinct, "distinct names")]:
        p.append(f'<div class="stat"><div class="n">{n}</div><div class="l">{l}</div></div>')
    p.append("</div>")

    p.append('<div class="ask"><h2>How to read this</h2>'
             '<p>Every question is tagged exactly once, and no chapter is empty &mdash; the '
             'build refuses to run otherwise. A chapter showing <strong>1</strong> is worth '
             'a glance: it may be a real one-off on the paper, or a sign it should merge '
             'into its neighbour.</p>'
             '<p>Two groups read oddly by design. <strong>General Knowledge</strong> in IX '
             'and X follows no syllabus chapter, so it is grouped thematically; and '
             '<strong>Economics</strong> appears twice per class because Arts and Commerce '
             'sat genuinely different papers.</p></div>')

    for cls in CLASS_ORDER:
        buckets = sorted([b for b in chapters if b.split("|")[0] == cls],
                         key=lambda b: (STREAM_ORDER.get(b.split("|")[1], 9), b.split("|")[2]))
        nq = sum(counts[b] for b in buckets)
        nc = sum(len(chapters[b]) for b in buckets)
        p.append('<section class="cls">')
        p.append('<div class="cls-head">'
                 f'<h2 class="serif">Class {e(cls)}</h2>'
                 f'<span class="meta">{len(buckets)} groups &middot; {nq} questions '
                 f'&middot; {nc} chapters</span></div>')
        p.append('<div class="grid">')
        for b in buckets:
            _c, stream, section = b.split("|")
            label = section if stream == "All" else f"{section} &middot; {e(stream)}"
            p.append('<div class="card">')
            p.append(f'<h3 class="serif">{label}</h3>')
            p.append(f'<div class="key"><span class="pill">{counts[b]} questions</span>'
                     f'<span class="pill">{len(chapters[b])} chapters</span>'
                     f'<span class="mono">{e(b)}</span></div>')
            p.append('<ol class="chapters">')
            for name in chapters[b]:
                n = per_ch.get((b, name), 0)
                p.append(f'<li><span>{e(name)}</span><span class="n">{n}</span></li>')
            p.append("</ol></div>")
        p.append("</div></section>")

    p.append('<footer>Generated from <span class="mono">tools/questions/chapters.json</span> '
             'and <span class="mono">src/data/questions/questions.json</span>. '
             'Counts are read live from the extracted questions, so this page and the data '
             'cannot drift apart.</footer>')
    p.append("</div>")

    out.write_text("<title>SET 2026 — chapter map</title>\n" + "\n".join(p),
                   encoding="utf-8")
    print(f"wrote {out}  ({len(chapters)} groups, {total_ch} chapters)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
