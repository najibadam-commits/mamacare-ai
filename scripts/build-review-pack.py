#!/usr/bin/env python3
"""Builds the printable clinical review pack (Word) from the triage rules.

    node scripts/export-review-pack.mjs review.json
    python3 scripts/build-review-pack.py review.json MamaCare_AI_triage_review_sheet.docx [version]

Needs: pip install python-docx
"""
import json, re, sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

src, out = sys.argv[1], sys.argv[2]
version = sys.argv[3] if len(sys.argv) > 3 else 'v0.1.0'
data = json.load(open(src, encoding='utf-8'))

NAMES = {
    'severe_bleeding': 'Heavy or abnormal bleeding',
    'pre_eclampsia': 'Severe headache, blurred vision (possible pre-eclampsia)',
    'convulsions': 'Fits / convulsions',
    'waters_broke': 'Waters breaking',
    'reduced_fetal_movement': 'Baby moving less',
    'fever_malaria': 'High fever / chills (possible malaria)',
    'postpartum_complication': 'Severe pain or foul discharge after birth',
}

def readable(p: str) -> str:
    """Turn a code pattern into something a clinician can read."""
    def group(m):
        opts = m.group(1).split('|')
        optional = '' in opts
        real = [o for o in opts if o != '']
        body = ' / '.join(o.strip() for o in real)
        if optional:
            return '[' + body + ']'
        return '{' + body + '}'
    s = re.sub(r'\(([^()]*)\)', group, p)
    s = re.sub(r'(\w)\*', r'\1…', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(1.8)
sec.top_margin, sec.bottom_margin = Cm(1.2), Cm(1.3)
st = doc.styles['Normal']; st.font.name = 'Arial'; st.font.size = Pt(10)
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
NAVY = RGBColor(0x0B, 0x3C, 0x5D)

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear'); sh.set(qn('w:color'), 'auto'); sh.set(qn('w:fill'), hexcolor); tcPr.append(sh)

def para(text='', bold=False, size=None, color=None, italic=False, after=4, align=None, keep=False):
    p = doc.add_paragraph(); r = p.add_run(text); r.bold = bold; r.italic = italic
    if size: r.font.size = Pt(size)
    if color: r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(0)
    if align: p.alignment = align
    if keep: p.paragraph_format.keep_with_next = True
    return p

def cell_text(cell, text, bold=False, size=9.5, italic=False):
    cell.text = ''
    p = cell.paragraphs[0]; r = p.add_run(text); r.bold = bold; r.italic = italic; r.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(2)

def widths(table, ws):
    table.autofit = False
    for row in table.rows:
        for c, w in zip(row.cells, ws): c.width = Cm(w)

def footer():
    p = sec.footer.paragraphs[0]
    p.text = f'MamaCare AI clinical review sheet  |  Version reviewed: {version}  |  Do not write any patient information on this sheet'
    p.runs[0].font.size = Pt(8); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer()

# ---------- Page 1: instructions and reviewer details ----------
para('MamaCare AI', bold=True, size=20, color=NAVY, after=0)
para('Clinical and language review sheet: danger-sign alerts', bold=True, size=14, after=6)
para(f'Version reviewed: {version}   |   Languages: English, Hausa, Nigerian Pidgin', size=9.5, after=8)

para('Why we are asking you', bold=True, size=11, color=NAVY, after=2)
para('MamaCare AI is a phone app for pregnant and postnatal women. When a woman types words that sound like a danger sign, the app shows a red '
     'alert and tells her what to do. These alerts, and the words that trigger them, were written by developers and have NOT yet been checked by '
     'health workers. Your review decides whether they are safe, correct and natural to read. The app only gives general advice; it never diagnoses '
     'or prescribes.', after=8)

para('How to review (about 20 to 30 minutes per danger sign)', bold=True, size=11, color=NAVY, after=2)
for t in [
    'Read the advice the app shows for each danger sign. Is it correct and safe? Is the wording clear to a woman in that language?',
    'Read the list of words and phrases that trigger the alert. Cross out any that are wrong or confusing. Write any missing ones in the box.',
    'Tick OK or Change. If Change, write the correction. Please do not tick OK without reading.',
    'Sign at the end of each danger sign you have reviewed. You may review only the signs and languages you are qualified for.',
]:
    p = doc.add_paragraph(t, style='List Number'); p.paragraph_format.space_after = Pt(2)
    for r in p.runs: r.font.size = Pt(10)

para('', after=2)
para('How to read the phrase lists', bold=True, size=11, color=NAVY, after=2)
leg = doc.add_table(rows=3, cols=2); leg.style = 'Table Grid'
for i, (a, b) in enumerate([('{ coming / pouring }', 'one of these words (any of them triggers the alert)'),
                             ('[ is ]', 'this word is optional (it may or may not be there)'),
                             ('bleed…', 'the word begins like this; any ending counts (bleed, bleeds, bleeding)')]):
    cell_text(leg.rows[i].cells[0], a, bold=True); cell_text(leg.rows[i].cells[1], b)
widths(leg, (4.2, 13.2))
para('The app also ignores capital letters, accents and punctuation. It does NOT ignore "not": "I am not bleeding" still raises the alert, on purpose, '
     'because a missed danger sign is worse than a false alarm.', italic=True, size=9, after=8)

para('Reviewer details (please print clearly)', bold=True, size=11, color=NAVY, after=2)
fields = [('Full name', ''), ('Role / qualification (for example midwife, CHEW, doctor, health worker)', ''), ('Registration or licence no. (optional)', ''),
          ('Health facility and LGA', ''), ('Date of review', ''), ('Languages you can review (tick)', '☐ English     ☐ Hausa     ☐ Nigerian Pidgin'),
          ('May we name you in the project record?', '☐ Yes, use my name     ☐ No, record only my role and facility'),
          ('Signature', '')]
t = doc.add_table(rows=len(fields), cols=2); t.style = 'Table Grid'
for i, (a, b) in enumerate(fields):
    cell_text(t.rows[i].cells[0], a, bold=True, size=9); shade(t.rows[i].cells[0], 'E8EEF3'); cell_text(t.rows[i].cells[1], b, size=9.5)
    t.rows[i].height = Cm(0.9)
widths(t, (7.4, 10.0))
para('', after=2)
para('Your details are used only for the project review record. Do not write anything about any patient on this sheet.', italic=True, size=9)

# ---------- One section per danger sign ----------
for n, sign in enumerate(data, 1):
    langs = sign['languages']
    urg = 'EMERGENCY' if any(l['emergency'] for l in langs) else 'URGENT'
    para(f'{n} of {len(data)}', size=9, color=RGBColor(0x66, 0x66, 0x66), after=0).paragraph_format.page_break_before = True
    para(NAMES.get(sign['id'], sign['id']), bold=True, size=15, color=NAVY, after=2)
    mixed = any(l['emergency'] for l in langs) and any(l['urgent'] for l in langs)
    note = {'EMERGENCY': 'Alert level: EMERGENCY (red alert: go to hospital now).', 'URGENT': 'Alert level: URGENT (red alert: see a health worker today).'}[urg]
    if mixed: note = 'Alert level: EMERGENCY for the main phrases; URGENT for the weaker phrases marked (weaker) below.'
    para(note, size=9.5, italic=True, after=6)

    para('A. What the app tells her', bold=True, size=10.5, after=2, keep=True)
    tb = doc.add_table(rows=1 + len(langs), cols=4); tb.style = 'Table Grid'
    for c, h in enumerate(['Language', 'Title shown', 'Advice shown', 'Your decision']):
        cell_text(tb.rows[0].cells[c], h, bold=True, size=9); shade(tb.rows[0].cells[c], 'D9E4EC')
    for i, l in enumerate(langs, 1):
        cell_text(tb.rows[i].cells[0], l['name'], bold=True, size=9)
        cell_text(tb.rows[i].cells[1], l['label'], size=9)
        cell_text(tb.rows[i].cells[2], l['advice'], size=8.5)
        cell_text(tb.rows[i].cells[3], '☐ OK\n☐ Change:\n\n', size=9)
    widths(tb, (2.0, 3.0, 10.2, 2.2))
    para('', after=4)

    para('B. Words and phrases that raise this alert (cross out wrong ones)', bold=True, size=10.5, after=2, keep=True)
    for l in langs:
        p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(1); p.paragraph_format.keep_with_next = True
        r = p.add_run(f"{l['name']}  "); r.bold = True; r.font.size = Pt(9.5)
        r2 = p.add_run(f"({len(l['emergency']) + len(l['urgent'])} patterns)"); r2.font.size = Pt(8); r2.italic = True
        body = '   •   '.join(readable(x) for x in l['emergency'])
        if l['urgent']:
            body += ('   •   ' if body else '') + '   •   '.join(readable(x) + ' (weaker)' for x in l['urgent'])
        q = doc.add_paragraph(body); q.paragraph_format.space_after = Pt(5)
        for r in q.runs: r.font.size = Pt(8)

    para('C. Missing words or phrases women really use, and any corrections', bold=True, size=10.5, after=2, keep=True)
    box = doc.add_table(rows=1, cols=1); box.style = 'Table Grid'
    box.rows[0].height = Cm(2.6); cell_text(box.rows[0].cells[0], '')
    para('', after=2)
    sg = doc.add_table(rows=1, cols=3); sg.style = 'Table Grid'
    for c, h in enumerate(['Reviewed by (name, role)', 'Signature', 'Date']): cell_text(sg.rows[0].cells[c], h, bold=True, size=8.5)
    sg.rows[0].height = Cm(1.1); widths(sg, (8.0, 6.0, 3.4))

doc.save(out)
print('saved', out)
