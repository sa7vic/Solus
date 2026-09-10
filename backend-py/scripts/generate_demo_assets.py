"""
Solus Demo Asset Generator (ASCII-safe)
Generates realistic binary demo files for all 6 role workspaces + rich KB .txt files.
Run: python backend-py/scripts/generate_demo_assets.py
"""

import os
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
UPLOADS = ROOT / "backend" / "uploads"
KB = ROOT / "backend" / "data" / "kb"

# ── PDF helper ─────────────────────────────────────────────────────────────
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)
from reportlab.lib.units import cm

def make_pdf(path, title, sections):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(path), pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph(title, styles['Title']))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#2563eb')))
    story.append(Spacer(1, 0.3*cm))
    for heading, body in sections:
        story.append(Paragraph(heading, styles['Heading2']))
        for line in body.strip().split('\n'):
            line = line.strip()
            if line:
                story.append(Paragraph(line, styles['Normal']))
        story.append(Spacer(1, 0.25*cm))
    doc.build(story)
    print("  [PDF]  " + str(path.relative_to(ROOT)))

# ── DOCX helper ────────────────────────────────────────────────────────────
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH

def make_docx(path, title, sections):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    h = doc.add_heading(title, level=0)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for heading, body in sections:
        doc.add_heading(heading, level=1)
        for line in body.strip().split('\n'):
            line = line.strip()
            if line:
                doc.add_paragraph(line)
    doc.save(str(path))
    print("  [DOCX] " + str(path.relative_to(ROOT)))

# ── XLSX helper ────────────────────────────────────────────────────────────
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

def make_xlsx(path, sheet_name, headers, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    ws = wb.active
    # Sheet name: strip any char openpyxl dislikes
    safe_name = sheet_name[:31]
    ws.title = safe_name
    fill = PatternFill("solid", fgColor="2563EB")
    bold_white = Font(bold=True, color="FFFFFF", size=11)
    for ci, h in enumerate(headers, 1):
        cell = ws.cell(1, ci, h)
        cell.fill = fill
        cell.font = bold_white
        cell.alignment = Alignment(horizontal='center')
    for ri, row in enumerate(rows, 2):
        for ci, val in enumerate(row, 1):
            ws.cell(ri, ci, val)
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 22
    wb.save(str(path))
    print("  [XLSX] " + str(path.relative_to(ROOT)))

# ── PPTX helper ────────────────────────────────────────────────────────────
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

def make_pptx(path, slides):
    path.parent.mkdir(parents=True, exist_ok=True)
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)
    layout = prs.slide_layouts[1]
    for sd in slides:
        slide = prs.slides.add_slide(layout)
        slide.shapes.title.text = sd['title']
        slide.shapes.title.text_frame.paragraphs[0].font.size = Pt(26)
        slide.shapes.title.text_frame.paragraphs[0].font.bold = True
        slide.shapes.title.text_frame.paragraphs[0].font.color.rgb = RGBColor(0x1e, 0x40, 0xaf)
        body_tf = slide.placeholders[1].text_frame
        body_tf.clear()
        lines = sd.get('body', [])
        if isinstance(lines, str):
            lines = lines.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            p = body_tf.paragraphs[0] if i == 0 else body_tf.add_paragraph()
            p.text = line
            p.font.size = Pt(15)
        if sd.get('notes'):
            slide.notes_slide.notes_text_frame.text = sd['notes']
    prs.save(str(path))
    print("  [PPTX] " + str(path.relative_to(ROOT)))

def make_txt(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + '\n', encoding='utf-8')
    print("  [TXT]  " + str(path.relative_to(ROOT)))

def make_py(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + '\n', encoding='utf-8')
    print("  [PY]   " + str(path.relative_to(ROOT)))

def make_md(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + '\n', encoding='utf-8')
    print("  [MD]   " + str(path.relative_to(ROOT)))

# =============================================================================
# INSPECTION / MAINTENANCE
# =============================================================================
print("\n=== INSPECTION / MAINTENANCE ===")

make_pdf(
    UPLOADS / "inspection/ws1/scan_C203_inspection_014.pdf",
    "EXTERNAL INSPECTION REPORT - Column C-203\nReport No. IR-2026-014",
    [
        ("1. Equipment Details", """
Equipment Tag: C-203  |  Type: Distillation Column  |  Service: Crude Atmospheric
P&ID No.: BPCL-CDU-PI-004  |  Location: CDU-1, Bay 4, North Plot
Year Manufactured: 2003  |  Next Statutory Inspection Due: October 2027
Design Pressure: 4.2 kg/cm2g  |  Operating Pressure: 2.8 kg/cm2g
Design Temperature: 385 degC  |  Wall Thickness (nominal): 12 mm
Material: Carbon Steel SA-516 Grade 70
        """),
        ("2. Inspection Findings", """
Finding 1 - Corrosion at Shell Course 3 (elevation approx. 8.2 m):
  General atmospheric corrosion. Measured thickness at 3 spots: 9.4 mm, 9.1 mm, 8.7 mm.
  Min allowable thickness per API-570: 8.0 mm. All readings above MWT. No immediate action.
  Recommended: Wire-brush and apply coal-tar epoxy coating (RPC-200) before next turnaround.

Finding 2 - Manhole Flange (18-inch, 150# ANSI RF, top head):
  Visible scoring on raised face. Scoring depth estimated 0.5-0.8 mm.
  No leakage. Joint integrity maintained by spiral-wound gasket (SS316 + graphite).
  Corrective: Re-face flange at next opportunity. Torque verified per BPCL-ME-0042: 340 Nm.

Finding 3 - Nozzle N-7 (4-inch reflux inlet):
  Minor pitting on external surface of reinforcement pad. 4 pits, max depth 1.2 mm.
  Evaluated per ASME VIII Div.1 Appendix 3 - acceptable. Wire-brush and primer coat applied.
        """),
        ("3. Thickness Measurements Summary", """
Location         | Nominal mm | Measured mm | % Remaining | Assessment
Shell CS-1       |   12.0     |   11.4      |    95.0%    | SATISFACTORY
Shell CS-3       |   12.0     |    9.1      |    75.8%    | MONITOR
Head (Top)       |   14.0     |   13.6      |    97.1%    | SATISFACTORY
Nozzle N-7 pipe  |    8.0     |    6.8      |    85.0%    | MONITOR
        """),
        ("4. Applicable Standards", """
API 510 - Pressure Vessel Inspection Code (9th Edition)
API 570 - Piping Inspection Code (4th Edition)
ASME Section VIII Div.1 - Rules for Construction of Pressure Vessels
BPCL Engineering Standard ME-0042 - Bolting and Torque Procedures
IS 2825:1969 - Code for Unfired Pressure Vessels
        """),
        ("5. Recommendations & Action Plan", """
1. Apply protective coating (coal-tar epoxy RPC-200) to Shell CS-3 - PRIORITY: LOW - Before Oct 2026 TA
2. Re-face manhole flange (18-inch top) - PRIORITY: MEDIUM - Schedule at next planned shutdown
3. Repeat thickness survey of Shell CS-3 at 12-month interval
4. No hot-work permit required for coating; standard cold-work permit CWPS-2024-0118
5. Close out via CMMS Work Order WO-2026-4417
        """),
        ("6. Inspector Sign-off", """
Inspecting Officer: R. Iyer  |  Certification: ASNT Level-II, API-510 #12034
Date of Inspection: 2026-08-22
Third-Party Witness: TUV Rheinland India Pvt. Ltd. (Inspector: A. Bose)
Next External Inspection Due: August 2028
Statutory Certificate No.: PESO-CERT-2026-0883
        """),
    ]
)

make_pdf(
    UPLOADS / "inspection/ws1/SOP-HSE-114.pdf",
    "Standard Operating Procedure - SOP-HSE-114\nSafe Isolation and Depressurisation of Pressure Vessels",
    [
        ("1. Purpose and Scope", """
This procedure defines minimum requirements for safe isolation, depressurisation,
and entry preparation for pressure vessels at BPCL Mumbai Refinery.
Applies to: All fixed pressure equipment above 0.5 kg/cm2 and/or above 50 degC.
Owner: Head of Inspection and Integrity | Doc No: SOP-HSE-114 Rev 4 | Date: 01 Apr 2024
        """),
        ("2. Prerequisites", """
(a) Valid Permit to Work (PTW) issued by Area Authority - displayed at work site
(b) Equipment isolated from all process connections - minimum double-block-and-bleed OR spade plates
(c) Relief valve upstream block valve LOCKED OPEN with padlock - tag: LOTOTO-BLUE
(d) Pressure gauge reading ZERO or atmospheric for minimum 15 continuous minutes
(e) Gas test completed: O2 19.5-23.5%, HC less than 10% LEL, H2S less than 5 ppm, CO less than 25 ppm
        """),
        ("3. Step-by-Step Procedure", """
Step 1: Issue and display Equipment Out-of-Service Tag at all isolation points.
Step 2: Close feed pump discharge valve (manual block) and fit blank flange at battery limit.
Step 3: Open high-point vent to flare header. Confirm flare pilot ON.
Step 4: Monitor pressure drop. Depressurise at max rate 0.5 kg/cm2 per minute to prevent implosion.
Step 5: Once pressure less than or equal to 0.1 kg/cm2, close vent. Open drain valve to slops.
Step 6: Allow to cool below 50 degC using thermocouple probe - verify calibration date.
Step 7: Purge with nitrogen (3 vessel volumes minimum) if vessel was in H2S service.
Step 8: Final gas test by certified Gas Tester - record results in permit.
Step 9: Issue Entry Permit (Form HSE-F-009). Station standby man at entry point.
        """),
        ("4. Emergency Response", """
If pressure does NOT drop after Step 3: Do NOT proceed. Notify Shift Superintendent immediately.
If H2S detected above 5 ppm: Evacuate 25-metre radius. Notify HSE duty officer.
If entrant shows distress: Pull using lifeline. Do NOT enter without SCBA (30-min air supply minimum).
        """),
    ]
)

make_pdf(
    UPLOADS / "inspection/ws1/API-570-digest.pdf",
    "API 570 Piping Inspection Code - Quick Reference Digest\n(4th Edition, 2016 - Internal Doc: BPCL-TID-112)",
    [
        ("Key Inspection Intervals (Table 7.1)", """
Class 1 Piping (Highly corrosive, toxic, high-pressure flammable service):
  External inspection: Annual
  Thickness survey: 5-year interval maximum
  CML coverage: 10% of weld joints and 100% of suspect areas

Class 2 Piping (All other hydrocarbon and process service):
  External inspection: 5-year interval
  Thickness survey: 10-year interval maximum

Class 3 Piping (Low-pressure, low-hazard utility service):
  External inspection: 10-year interval
  Thickness survey: 10-year (risk-based extension to 15 years allowed)
        """),
        ("Minimum Wall Thickness Formula (Section 5.7)", """
t_min = (P x D) / (2 x S x E + 2 x P x Y)
Where:
  P = Internal design pressure (psig)
  D = Outside diameter (inches)
  S = Allowable stress at design temperature (psi) from ASME B31.3 Table A-1
  E = Quality factor (longitudinal weld joint factor, typically 0.8-1.0)
  Y = Wall thickness coefficient (0.4 for ferritic steels below 900 degF)

Retirement Thickness (t_ret) = t_min + Corrosion Allowance (CA)
Remaining Life = (t_actual - t_min) / Corrosion Rate (CR) per year
        """),
        ("Corrosion Rates - Crude Refinery Service (Table A-2)", """
Carbon Steel in crude overhead service (HCl environment): 0.1-0.3 mm per year
Carbon Steel in atmospheric residue service: 0.05-0.15 mm per year
SS 316L in sulfidic service above 260 degC: 0.01-0.05 mm per year (check Nelson Curve)
Duplex SS in sour water stripper: 0.01-0.02 mm per year
        """),
        ("Injection Point Inspection (Section 7.3.3)", """
Injection points (chemical, water wash, corrosion inhibitor) require enhanced monitoring:
  Upstream 12 inches + entire downstream elbow + 2 straight pipe lengths
  RT or UT phased array at 6-month intervals if active corrosion is present
  Profile RT preferred for injection point elbows
  Document baseline thickness at commissioning - minimum 5 readings per CML
        """),
    ]
)

make_pdf(
    UPLOADS / "inspection/ws1/inspection_archive_C203_2023.pdf",
    "Historical Inspection Archive - Column C-203\n2019-2023 Consolidated Record",
    [
        ("Inspection History Summary", """
Report IR-2019-007: Shell thickness min 10.6 mm, all findings SATISFACTORY, no defects.
Report IR-2020-011: Minor surface rust on CS-3, thickness 10.1 mm, monitoring recommended.
Report IR-2021-009: CS-3 thickness 9.8 mm, CR estimated 0.15 mm/year, continue monitoring.
Report IR-2022-014: CS-3 thickness 9.5 mm, two pitting sites 1.0 mm depth, coating applied.
Report IR-2023-018: CS-3 thickness 9.2 mm, manway scoring identified, torque retightening done.
Current 2026-014: CS-3 thickness 9.1 mm (multi-point), estimated remaining life 7.3 years.
        """),
        ("Corrosion Rate Trend - Shell Course 3", """
Year 2019 | Thickness 10.6 mm | Delta N/A     | Rate N/A
Year 2020 | Thickness 10.1 mm | Delta 0.5 mm  | Rate 0.50 mm/yr
Year 2021 | Thickness  9.8 mm | Delta 0.3 mm  | Rate 0.30 mm/yr
Year 2022 | Thickness  9.5 mm | Delta 0.3 mm  | Rate 0.30 mm/yr
Year 2023 | Thickness  9.2 mm | Delta 0.3 mm  | Rate 0.30 mm/yr
Year 2026 | Thickness  9.1 mm | Delta 0.1 mm* | Rate 0.033 mm/yr (*3-year gap)
Weighted average CR (2019-2026): 0.214 mm per year
Estimated remaining life at MWT 8.0 mm: (9.1-8.0) / 0.214 = 5.1 years
Next mandatory inspection: August 2028 (4.1 years remaining - WITHIN retirement life)
        """),
    ]
)

# =============================================================================
# PROCESS / PRODUCTION
# =============================================================================
print("\n=== PROCESS / PRODUCTION ===")

make_xlsx(
    UPLOADS / "process/ws1/relief_valve_sizing_T114.xlsx",
    sheet_name="Relief Valve Sizing T-114",
    headers=["Parameter", "Symbol", "Value", "Unit", "Reference"],
    rows=[
        ["Vessel Name",                     "-",    "Storage Tank T-114",        "-",         "P&ID BPCL-TK-001"],
        ["Service",                          "-",    "Crude Oil (36 API)",         "-",         "Process Datasheet"],
        ["Design Pressure",                  "Pd",   8.5,                          "kg/cm2g",   "ASME VIII / IS 2825"],
        ["Set Pressure",                     "Ps",   7.8,                          "kg/cm2g",   "10% below Pd per API 520"],
        ["Operating Pressure",               "Po",   6.2,                          "kg/cm2g",   "Process PFD-CDU-003"],
        ["Design Temperature",               "Td",   185,                          "degC",      "Process Datasheet"],
        ["Fluid",                            "-",    "Crude Oil Vapour",           "-",         "-"],
        ["Molecular Weight",                 "MW",   142,                          "kg/kmol",   "Simulation Model"],
        ["Latent Heat",                      "L",    312,                          "kJ/kg",     "Perry's 8th Ed Table 2-150"],
        ["Required Relief Load (fire case)", "W",    18500,                        "kg/hr",     "API 521 S5.15"],
        ["Orifice Area Required",            "A",    1850,                         "mm2",       "API 520 Eq. 3-1"],
        ["Selected Valve Type",              "-",    "Full-bore Spring-loaded",    "-",         "API 526"],
        ["Selected Orifice Designation",     "-",    "P (62.6 cm2)",               "-",         "API 526 Table 1"],
        ["Inlet Line Size",                  "-",    "DN 100 (4-inch SCH 80)",     "-",         "3% inlet loss limit"],
        ["Back Pressure (built-up)",         "-",    "12%",                        "% of Ps",   "< 10% for conventional"],
        ["Back Pressure Action",             "-",    "Use Balanced Bellows",       "-",         "API 520 S4.3.2.1"],
        ["Discharge Pipe Size",              "-",    "DN 150 (6-inch SCH 40)",     "-",         "Tail-pipe sizing"],
        ["PSV Tag Numbers",                  "-",    "PSV-114-001A/B",             "-",         "CMMS Asset DB"],
        ["Last Test Date",                   "-",    "2025-03-14",                 "-",         "Test Cert TC-2025-0088"],
        ["Calculated by",                    "-",    "S. Menon (Process Eng.)",    "-",         "Solus AI-assisted calc"],
    ]
)

make_pdf(
    UPLOADS / "process/ws1/process_manual_relief_systems.pdf",
    "Process Engineering Manual - Relief and Blowdown Systems\nBPCL Mumbai Refinery - CDU-1 Unit",
    [
        ("1. Introduction", """
This manual covers the engineering basis for relief and blowdown systems across CDU-1
at BPCL Mumbai Refinery. Design philosophy follows API Standard 520 (Sizing, Selection,
and Installation of Pressure-Relieving Devices) and API Standard 521 (Pressure-Relieving
and Depressuring Systems).
All relief loads are routed to the main refinery flare header (8-inch, 300# ANSI, operating
at 0.3 kg/cm2g back pressure). Maximum allowable back pressure on conventional valves: 10% of set.
        """),
        ("2. Fire Case Relief Load Calculation Basis", """
For liquid-filled vessels exposed to fire (API 521 Section 5.15.1.2):
Q = 43,200 x F x A^0.82  (BTU/hr)  -- wetted surface heat absorption
where:
  F = Environmental factor (0.9 for bare vessel; 0.3 for adequate drainage + foam)
  A = Wetted surface area in square feet

Heat absorbed by liquid: Q_absorbed = W x latent_heat
Required relief rate: W = Q / latent_heat

For T-114 (crude service, F=0.9, A=420 ft2):
Q = 43,200 x 0.9 x 420^0.82 = 5,781,000 BTU/hr = 1,693 kW
W = 5,781,000 / 134 BTU/lb = 43,142 lb/hr = 18,500 kg/hr  CONFIRMED
        """),
        ("3. Flare Header Hydraulics", """
Maximum allowable velocity in flare header: Mach 0.5 at tip (noise and vibration limit).
Main header: DN 200 (8-inch) at 0.3 kg/cm2g. Capacity: 65,000 kg/hr equivalent vapour load.
Simultaneous relief scenarios (HAZOP Nodes R-3, R-7, R-12):
  Normal operation: less than 15,000 kg/hr (single PSV scenario)
  Fire case: 18,500 kg/hr (T-114 is largest contributor - governs header sizing)
  Full blocked outlet: 22,000 kg/hr (not credible - blocked flow PSV on independent line)
Flare header is adequate for all design cases. No debottlenecking required at this time.
        """),
        ("4. Valve Maintenance Requirements", """
Relief valve inspection intervals per ASME PCC-3 and BPCL-ME-0088:
  Conventional spring-loaded in non-corrosive service: 5-year interval
  Balanced bellows in corrosive / sour service: 3-year interval
  Pilot-operated in clean service with clean pilot: 5-year (proof test mandatory)
All PSVs to be bench-tested, set-point verified, and re-sealed by approved shop.
Records in CMMS (Maximo Asset ID: PSV-114-001A and PSV-114-001B).
        """),
    ]
)

make_pptx(
    UPLOADS / "process/ws1/CDU1_process_overview_Q3.pptx",
    [
        {"title": "CDU-1 Process Performance Review - Q3 FY2026",
         "body": ["BPCL Mumbai Refinery | Crude Distillation Unit - Unit 100",
                  "Process Engineering Department | September 2026"],
         "notes": "Quarterly process review for management"},
        {"title": "Crude Throughput - Q3 FY2026",
         "body": ["Q3 Actual Throughput: 2,84,000 MT  |  Plan: 2,90,000 MT  |  Variance: -2.1%",
                  "Average crude mix: 65% Arab Light, 35% Bombay High",
                  "Crude API: 33.4 (avg)  |  Sulphur: 1.82% wt",
                  "Days lost to unplanned shutdown: 2.5 days (HEX E-104 tube failure)",
                  "Annualised throughput run-rate: 11.36 MMTPA (capacity: 12 MMTPA)"],
         "notes": "Throughput slightly below plan due to E-104 failure in August."},
        {"title": "Key Product Yields - Q3 vs Plan",
         "body": ["LPG:        Actual 3.8%  | Plan 3.9%  | Gap -0.1%",
                  "Naphtha:    Actual 12.4% | Plan 11.8% | Gap +0.6% (lighter crude mix)",
                  "Kero / ATF: Actual 14.2% | Plan 15.0% | Gap -0.8% (reflux ratio adjusted)",
                  "Gas Oil:    Actual 28.6% | Plan 28.0% | Gap +0.6%",
                  "Residue:    Actual 41.0% | Plan 41.3% | Gap -0.3%",
                  "Action: Optimise column 1 reflux ratio to recover ATF yield."],
         "notes": "Naphtha above plan due to lighter crude API."},
        {"title": "Energy Intensity - Q3 FY2026",
         "body": ["Specific Energy Consumption: 62.4 MBTU/MT  (Plan: 60.0 | YoY: 61.8)",
                  "Primary fuel: refinery fuel gas accounts for 84% of energy input",
                  "F-101 (Pre-Flash Heater) efficiency: 89.2% vs design 91.5%",
                  "Action: Schedule tube-side decoking of F-101 in Oct 2026 turnaround",
                  "Steam balance: Excess LP steam venting 1.2 T/hr -- review LP consumers",
                  "Potential saving: Rs 28 lakhs/year if LP steam venting eliminated"],
         "notes": "Energy intensity 4% above plan. F-101 decoking is critical action."},
        {"title": "Q4 FY2026 Priorities",
         "body": ["1. F-101 decoking - Oct 2026 planned turnaround (8 days duration)",
                  "2. AV-303 compressor anti-surge valve overhaul (Q4 Week 1)",
                  "3. LT-112A 2oo3 voting upgrade - target completion Nov 2026",
                  "4. Crude oil blend optimisation study (Urals / Basra Heavy trial in Q4)",
                  "5. Energy audit by Centre for High Technology (CHT) - scheduled Dec 2026"],
         "notes": "Q4 has one planned shutdown and several proactive reliability actions."},
    ]
)

# =============================================================================
# HSE
# =============================================================================
print("\n=== HSE ===")

make_pdf(
    UPLOADS / "hse/ws1/shift_log_2026-08-30.pdf",
    "HSE Shift Log - Date: 30 August 2026\nBPCL Mumbai Refinery - A Shift (06:00-18:00)",
    [
        ("Shift Summary", """
Shift HSE Officer: K. Sundaram  |  Area covered: CDU-1, Utilities, Tank Farm
Total Rounds: 3 (07:00, 11:00, 15:30)  |  PTW Active: 14  |  PTW Closed: 11
Personnel on site: 847  |  Contractors: 312  |  Visitors: 8 (with escort)
Weather: Clear, wind 12 km/hr SW, temperature 31 degC, humidity 78%
        """),
        ("Near Misses / Incidents", """
NM-0142 (10:35 hrs) - Hydrocarbon release from sample point SP-201 (C-203 bottom)
  Location: CDU-1, Bay 4, sample point platform (elevation 3.5 m)
  Vapour cloud detected by Area Gas Monitor AM-204 - alarm at 20% LEL, area evacuated.
  Root cause (preliminary): Sample valve packing worn; replacement not done at last PM.
  Immediate action: Area evacuated, fire water deluge tested, valve isolated and blanked.
  Photo evidence: 4 photographs taken (NM0142_photo_01 through 04). Filed in incident system.
  Investigation team: HSE Manager + Process Engineer + Instrument Supervisor

No LTI (Lost Time Injury) incidents this shift.
        """),
        ("Unsafe Conditions Observed", """
UC-01: Worker on scaffold at T-112 without chin-strap on helmet - immediately corrected.
UC-02: Fire extinguisher FE-0312 in CDU-1 control room expired (due Aug 2026) - replaced.
UC-03: Emergency shower ES-0048 at Bay 4 - water flow below 75 L/min (standard: 76 L/min minimum).
  Action: Maintenance WO raised (WO-2026-4421). Shower yellow-tagged until repaired.
        """),
        ("PTW Status Summary", """
High Risk PTWs Active at Shift End:
  PTW-2026-1884: Hot work - welding at F-101 structure (2 hours remaining)
  PTW-2026-1901: Confined space entry - C-203 manhole (ongoing, standby man in place)
  PTW-2026-1912: Work at height - Scaffold at T-112 (all workers cleared by 17:00)
All other PTWs: Routine electrical/instrument maintenance - no elevated risk.
Handover to B Shift HSE Officer: L. Nair - briefed on NM-0142 and ES-0048 status.
        """),
    ]
)

make_pdf(
    UPLOADS / "hse/ws1/safety_advisory_NM0142.pdf",
    "SAFETY ADVISORY - SA-2026-031\nHydrocarbon Release Near-Miss - NM-0142",
    [
        ("Incident Details", """
Date/Time: 30-Aug-2026, 10:35 hrs  |  Location: CDU-1 Bay 4, Sample Point SP-201
Equipment: Column C-203 (Crude Distillation)  |  Reported by: K. Sundaram (HSE)
Potential Consequence: HIPO - Category 2 (Major injury / significant fire potential)
        """),
        ("Root Cause Analysis (5-Why)", """
Why 1: Hydrocarbon vapour released from sample valve SP-201.
Why 2: Sample valve stem packing worn and leaking past stem.
Why 3: PM checklist for SP-201 valve packing not completed at last turnaround (Apr 2026).
Why 4: Scope of packing replacement not included in turnaround job list.
Why 5: Sample valves below 2-inch NPS excluded from valve packing PM programme - systemic gap.
ROOT CAUSE: Inadequate preventive maintenance scope for sample point valves below 2-inch NPS.
        """),
        ("Corrective and Preventive Actions (CAPA)", """
Immediate (Completed):
  SP-201 isolated and blanked. Area cleared and re-ventilated.
  All sample points in CDU-1 visually inspected - 3 additional valves flagged for packing.

Short-term (By 30-Sep-2026):
  All CDU-1 sample valve packing replacements - WO-2026-4418 through 4420 raised.
  Revise PM checklist ME-PM-0088 to include all sample valves regardless of NPS.

Long-term (By 31-Dec-2026):
  Engineering review of converting all sample points to closed-loop sampling (zero-emission).
  Hydrocarbon gas monitor coverage review - consider additional fixed-point detector at Bay 4.
        """),
        ("Learnings - Share Widely", """
1. Do not assume small-bore valves are low-risk - sample points carry full process pressure.
2. PM programme must include all valve types including sample/drain/vent below 1-inch NPS.
3. Area gas monitor AM-204 detected the release correctly - fixed gas detectors save lives.
4. Emergency response (evacuation, firewater test) completed in under 4 minutes - effective.
Distribution: All Refinery HODs, All Shift Supervisors, Safety Committee
Issued by: S. Krishnan, Head of HSE  |  Date: 31-Aug-2026
        """),
    ]
)

make_pdf(
    UPLOADS / "hse/ws1/life_saving_rules.pdf",
    "BPCL Life Saving Rules - LSR Version 3.0\nMandatory for ALL personnel on site",
    [
        ("LSR-01: Work Permit", "Always obtain a valid Work Permit before beginning non-routine work. The permit must be signed by the Area Authority and displayed at the work site. Never work on a verbal permit or an expired permit."),
        ("LSR-02: Confined Space", "Never enter a confined space without a valid Confined Space Entry Permit. Continuous gas monitoring, standby man, and rescue equipment are mandatory. Never enter alone."),
        ("LSR-03: Isolation and LOTO", "Always verify that energy (electrical, pressure, thermal, gravitational) is fully isolated and locked out before working on equipment. Test for zero energy state - do not assume."),
        ("LSR-04: Working at Height", "Always use fall protection (harness, lanyard, anchor point) when working above 1.8 metres. Inspect equipment before use. No work at height when wind exceeds 40 km/hr."),
        ("LSR-05: Hot Work", "Never perform hot work (welding, grinding, cutting) without a valid Hot Work Permit. Confirm combustible gas reading below 5% LEL within 5 minutes of starting work."),
        ("LSR-06: Driving Safety", "Observe 25 km/hr plant speed limit. Seat belt mandatory. No mobile phone use while driving. Do not drive fatigued."),
        ("LSR-07: Alcohol and Drugs", "Absolute prohibition of alcohol and controlled substances on site. Random testing is conducted. Violation results in immediate removal and criminal referral."),
        ("LSR-08: Bypassing Safety Systems", "Never bypass, defeat, or override a safety-critical protection system (SIS, fire/gas detectors, PSV, ESD) without formal Management of Change and PTW."),
    ]
)

make_xlsx(
    UPLOADS / "hse/ws1/incident_reports_Q3_2026.xlsx",
    sheet_name="Q3 Incident Register",
    headers=["Incident ID", "Date", "Type", "Location", "Severity", "LTI Days", "Root Cause", "CAPA Status"],
    rows=[
        ["NM-0128", "2026-07-04", "Near Miss",        "Tank Farm TK-08",         "Category 1",  0, "Procedure Deviation", "Closed"],
        ["FA-0129", "2026-07-11", "First Aid",         "CDU-1 Bay 2",             "Category 1",  0, "PPE Failure",         "Closed"],
        ["NM-0130", "2026-07-18", "Near Miss",         "Utilities Compressor",    "Category 2",  0, "Equipment Failure",   "In Progress"],
        ["UC-0131", "2026-07-25", "Unsafe Condition",  "CDU-2 Control Room",      "Observation", 0, "Housekeeping",        "Closed"],
        ["NM-0133", "2026-08-01", "Near Miss",         "VDU Unit Bay 1",          "Category 1",  0, "Procedure Deviation", "Closed"],
        ["FA-0137", "2026-08-14", "First Aid",         "Maintenance Workshop",    "Category 1",  0, "Ergonomics",          "Closed"],
        ["NM-0140", "2026-08-22", "Near Miss",         "CDU-1 F-101 Area",        "Category 1",  0, "Communication",       "Closed"],
        ["NM-0142", "2026-08-30", "Near Miss (HIPO)",  "CDU-1 Bay 4 SP-201",     "Category 2",  0, "PM Programme Gap",   "In Progress"],
        ["UC-0144", "2026-09-05", "Unsafe Condition",  "CDU-1 Bay 2 Scaffold",   "Observation", 0, "Supervision Gap",     "Closed"],
    ]
)

# =============================================================================
# PROCUREMENT
# =============================================================================
print("\n=== PROCUREMENT ===")

for vendor, model, price_l, del_wk, warranty_mo in [
    ("Atlas Copco India",    "GA90VSD+",    38.4, 12, 24),
    ("Kirloskar Pneumatic",  "KC-90-7.5",   31.2,  8, 18),
    ("Ingersoll Rand India", "R90ie-A7.5",  35.8, 10, 24),
]:
    slug = vendor.lower().split()[0]
    gst = round(price_l * 0.18, 2)
    total = round(price_l * 1.18, 2)
    make_pdf(
        UPLOADS / f"procurement/ws1/quote_{slug}.pdf",
        f"Commercial Quotation - {vendor}\nRef: BPCL-PROC-RFQ-2026-0441",
        [
            ("Vendor Details", f"Vendor: {vendor}\nContact: procurement@{slug}.com"),
            ("Quoted Equipment", f"""
Item: Screw Air Compressor, Oil-flooded, Variable Speed Drive
Model: {model}
Capacity: 16.5 m3/min FAD @ 7.5 bar(g)
Motor: 90 kW, IE3 efficiency class, TEFC enclosure
Pressure range: 4.0-13.0 bar(g) (VSD turndown)
Scope: Supply, delivery to site, commissioning supervision (2 days)
            """),
            ("Commercial Terms", f"""
Unit Price (ex-works): Rs {price_l} Lakhs + GST at 18% (HSN 8414)
GST Amount: Rs {gst} Lakhs
Total (including GST): Rs {total} Lakhs
Delivery: {del_wk} weeks from Purchase Order
Payment: 30% advance, 60% on dispatch, 10% after commissioning
Warranty: {warranty_mo} months from date of commissioning
Validity: 60 days from quote date (01 Sep 2026)
            """),
            ("Technical Compliance", """
Motor Efficiency: IE3 (BEE mandated)  COMPLIANT
Noise Level: 73 dB(A) at 1 metre (CPCB Noise Rules 2000)  COMPLIANT
Refrigerant Dryer: Included, R-410A (no ODS)  COMPLIANT
PESO Certification: Valid  COMPLIANT
Factory Acceptance Test (FAT): Offered at no extra cost  COMPLIANT
            """),
        ]
    )

make_xlsx(
    UPLOADS / "procurement/ws1/compressor_vendor_comparison.xlsx",
    sheet_name="Vendor Comparison",
    headers=["Criterion", "Weight", "Atlas Copco GA90VSD+", "Kirloskar KC-90", "Ingersoll Rand R90ie"],
    rows=[
        ["Price ex-GST (Rs Lakhs)",            "25%", 38.4,  31.2,  35.8],
        ["Delivery (weeks)",                   "15%", 12,    8,     10],
        ["Warranty (months)",                  "10%", 24,    18,    24],
        ["Service network (India sites)",      "15%", 48,    22,    35],
        ["Energy efficiency (kW per m3/min)",  "20%", 5.45,  5.82,  5.61],
        ["MTBF (documented, hours)",           "10%", 45000, 38000, 42000],
        ["OEM spares lead time (weeks)",        "5%", 2,     4,     3],
        ["Reference refineries",               "N/A", "HPCL IOC MRPL", "IOC ONGC", "BPCL Kochi CPCL"],
        ["RECOMMENDATION",                     "---", "PREFERRED",     "BACKUP (cost)", "ALTERNATIVE"],
    ]
)

make_docx(
    UPLOADS / "procurement/ws1/contract_template_standard.docx",
    "Purchase Order / Contract Template - BPCL Standard Form\nForm No: BPCL-PROC-F-004 Rev 2",
    [
        ("1. Parties", "This Purchase Order (PO) is issued by Bharat Petroleum Corporation Limited (Buyer), Mumbai Refinery, Mahul Road, Chembur, Mumbai 400074, to the Supplier identified on the face of this PO."),
        ("2. Scope of Supply", "The Supplier shall supply goods/services as described in Schedule A (Technical Specifications) and Schedule B (Commercial Terms). Any deviation from Schedule A must be approved in writing by the Buyer's Project Engineer prior to manufacture."),
        ("3. Price and Payment", "Price is firm and fixed. No price escalation permitted unless agreed in writing. Payment terms: 30% advance against Bank Guarantee; 60% against dispatch documents plus inspection certificate; 10% after commissioning and acceptance."),
        ("4. Delivery", "Time is of the essence. Liquidated damages for delay: 0.5% of contract value per week of delay, up to a maximum of 5%. Delivery free of all charges to BPCL Mumbai Refinery main gate."),
        ("5. Inspection and Testing", "Factory Acceptance Test (FAT) mandatory for all rotating equipment. Buyer to be given 7 days notice. Equipment shall not be dispatched without written dispatch clearance from Buyer's Inspector."),
        ("6. Warranty", "Supplier warrants equipment free from defects for the period stated. Warranty commences from date of successful commissioning or 12 months from dispatch, whichever is earlier."),
        ("7. Governing Law", "This agreement is governed by the laws of India. Disputes to be resolved by arbitration under the Arbitration and Conciliation Act 1996, with Mumbai as the seat of arbitration."),
    ]
)

# =============================================================================
# BOARD / CORPORATE
# =============================================================================
print("\n=== BOARD / CORPORATE ===")

make_xlsx(
    UPLOADS / "board/ws1/q3_financial_summary.xlsx",
    sheet_name="Q3 FY2026 PL Summary",
    headers=["Line Item", "Q3 FY2025 (Rs Cr)", "Q3 FY2026 (Rs Cr)", "YoY Change (Rs Cr)", "YoY %"],
    rows=[
        ["Revenue from Operations",   98420,  104850, 6430,   "6.5%"],
        ["Other Income",               820,      910,   90,  "11.0%"],
        ["Total Revenue",             99240,  105760, 6520,   "6.6%"],
        ["Cost of Materials",         82100,   86200, 4100,   "5.0%"],
        ["Employee Benefits",          1840,    1980,  140,   "7.6%"],
        ["Finance Costs",               420,     380,  -40,  "-9.5%"],
        ["Depreciation",                680,     720,   40,   "5.9%"],
        ["Other Expenses",             3200,    3450,  250,   "7.8%"],
        ["TOTAL EXPENSES",            88240,   92730, 4490,   "5.1%"],
        ["PROFIT BEFORE TAX",         11000,   13030, 2030,  "18.5%"],
        ["Tax Expense (25.17%)",       2769,    3279,  510,  "18.4%"],
        ["NET PROFIT AFTER TAX",       8231,    9751, 1520,  "18.5%"],
        ["EBITDA",                    12100,   14130, 2030,  "16.8%"],
        ["EBITDA Margin",             "12.2%", "13.4%", "+1.2pp", "-"],
        ["EPS (Basic, Rs)",           17.84,   21.13, 3.29,  "18.5%"],
        ["GRM (USD per bbl)",          8.4,     9.8,   1.4,  "16.7%"],
    ]
)

make_pptx(
    UPLOADS / "board/ws1/Q3_automation_readiness.pptx",
    [
        {"title": "Digital and AI Transformation - Q3 FY2026 Update",
         "body": ["Board Strategy Committee | CONFIDENTIAL",
                  "BPCL Mumbai Refinery | September 2026"],
         "notes": "Quarterly board update on digital and AI transformation programme"},
        {"title": "Executive Summary",
         "body": ["Rs 148 Cr digital transformation investment - 74% deployed as of Q3",
                  "12 of 18 planned digital initiatives LIVE in production",
                  "Quantified benefits realised in Q3: Rs 42.3 Cr annualised savings",
                  "Solus AI Workbench Pilot: 6 departments, 94 users - productivity +38%",
                  "GRM improvement from AI-assisted crude blend optimisation: +USD 0.4/bbl",
                  "Overall programme status: GREEN (on time, within budget)"],
         "notes": "Strong quarter - productivity and GRM improvement are key headlines"},
        {"title": "Solus - Sovereign AI Workbench (Pilot Results)",
         "body": ["Deployed: June 2026 | Pilot departments: Inspection, Process, HSE, Procurement, IT, Board",
                  "Active users in Q3: 94 of 150 licences issued",
                  "Tasks completed via Solus: 1,842 (documents, calculations, code, analysis)",
                  "Average time saved per task: 2.8 hours -- total: 5,158 man-hours saved in Q3",
                  "At Rs 800/hr fully loaded cost: Rs 41.3 Cr annualised savings from Solus alone",
                  "Zero data leakage events -- all inference on-premises, air-gapped (verified monthly)",
                  "Net Promoter Score (internal): 74 -- exceptionally high for enterprise software"],
         "notes": "Solus numbers headline slide -- use for board narrative"},
        {"title": "Automation ROI - Q3 FY2026",
         "body": ["Programme investment to date: Rs 109.5 Cr (of Rs 148 Cr sanctioned)",
                  "Realised savings YTD: Rs 89.4 Cr annualised",
                  "Payback period (revised): 19 months (original: 24 months)",
                  "IRR (updated): 34% (original projection: 28%)",
                  "Top value drivers: AI inspection Rs 18 Cr, process optimisation Rs 22 Cr, Solus Rs 41 Cr",
                  "Procurement AI: Rs 8.2 Cr savings from vendor negotiation support in Q3"],
         "notes": "IRR improved from 28% to 34% -- strong ROI narrative for board"},
        {"title": "Board Resolution Required",
         "body": ["RESOLUTION: Approval of supplementary capital expenditure",
                  "Amount: Rs 38.5 Crore",
                  "Purpose: Expansion of Solus AI Workbench to all BPCL refineries",
                  "Business case: 19-month payback, 34% IRR, zero data sovereignty risk",
                  "Risk assessment: Technology risk LOW (proven in 6-month pilot)",
                  "RECOMMENDATION: APPROVE"],
         "notes": "Board resolution slide -- needs formal motion at this meeting"},
    ]
)

make_pdf(
    UPLOADS / "board/ws1/strategy_note_automation_2026.pdf",
    "Strategy Note - AI and Automation Roadmap FY2026-2028\nBPCL Mumbai Refinery | CONFIDENTIAL",
    [
        ("Executive Summary", """
This note presents the three-year AI and automation strategy for BPCL Mumbai Refinery
covering the period FY2026-FY2028. The strategy is built around three pillars:
(1) Operational Excellence through predictive maintenance and process optimisation AI,
(2) Knowledge Sovereignty through the Solus on-premise AI workbench, and
(3) Supply Chain Intelligence through crude blend and procurement optimisation.
Total capital commitment: Rs 148 Cr (FY2026) + Rs 230 Cr (FY2027-28, subject to board approval).
Target impact by FY2028: Rs 420 Cr annualised savings, GRM improvement of +USD 1.2 per bbl.
        """),
        ("Pillar 1 - Operational AI", """
FY2026 Initiatives:
  Predictive maintenance for 24 critical rotating equipment (Phase 1: 6 items live in Q3)
  Real-time process optimisation model for CDU-1 (yield improvement target: +0.5% ATF)
  Flare monitoring AI to detect and reduce flaring events (environmental + commercial benefit)

FY2027-28 Scale-up:
  Extend PdM to all 120 critical equipment items across CDU-1, CDU-2, VDU, and FCCU
  Digital twin of CDU-1 integrated with real-time DCS data
  Autonomous crude-to-product optimisation with human-in-the-loop approval
        """),
        ("Pillar 2 - Knowledge Sovereignty (Solus AI Workbench)", """
The Solus platform addresses the critical gap between cloud AI productivity tools and
the data sovereignty requirements of Indian PSUs and strategic industries.

Current status: 94 users across 6 departments, productivity gain of +38%.
All data remains on BPCL servers. No data transmitted to external AI providers.
Air-gap compliance verified by Network Security team on monthly basis.

FY2027 expansion: Deploy Solus to BPCL Kochi Refinery and Numaligarh Refinery.
FY2028 expansion: Deploy to all BPCL locations including retail and LPG divisions.
Licensing model being explored: Shared-service across Oil PSUs (HPCL, ONGC).
        """),
        ("Pillar 3 - Supply Chain Intelligence", """
Crude Optimisation: AI model to recommend optimal crude mix for maximum GRM.
  Current GRM: USD 9.8 per bbl (Q3 FY2026). Target with AI optimisation: USD 11.0 per bbl by FY2028.

Procurement AI: Vendor analysis and negotiation support (Solus Procurement module).
  Q3 realised savings: Rs 8.2 Cr from AI-assisted vendor comparison and counter-offers.

Inventory Optimisation: Reduce safety stock of critical spares by 20% using demand forecasting.
  Current critical spares inventory: Rs 142 Cr. Target reduction: Rs 28 Cr working capital release.
        """),
        ("Governance and Risk", """
Data Governance: All AI models trained exclusively on BPCL data. No third-party data sharing.
Model Risk: All AI outputs reviewed by domain experts before implementation. Human-in-the-loop mandatory.
Cybersecurity: Solus air-gapped from internet. OT/IT segregation maintained. MoPNG audit due Dec 2026.
Regulatory: No regulatory barriers to on-premise AI deployment. MCA and SEBI guidelines reviewed.
People: Change management programme - 500 employees to be trained on AI literacy by FY2027.
        """),
    ]
)

# =============================================================================
# IT / AUTOMATION
# =============================================================================
print("\n=== IT / AUTOMATION ===")

make_py(UPLOADS / "it/ws1/sensor_ingest.py", '''"""
sensor_ingest.py -- DCS Historian to PostgreSQL Ingest Pipeline
BPCL Mumbai Refinery | IT Automation Team
Reads tag values from OSIsoft PI Historian (via PI Web API) and writes
to the internal Time-Series PostgreSQL database for dashboards.

Dependencies:
    pip install requests psycopg2-binary pandas python-dotenv schedule
"""

import os
import logging
import time
import schedule
import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("sensor_ingest")

# -- Configuration --
PI_BASE_URL = os.getenv("PI_BASE_URL", "http://pi-server.bpcl.internal/piwebapi")
PI_USERNAME  = os.getenv("PI_USERNAME", "svc_solus_readonly")
PI_PASSWORD  = os.getenv("PI_PASSWORD")   # Must be in .env -- never hardcode!

PG_DSN = os.getenv("PG_DSN", "host=pg-db.bpcl.internal dbname=refinery_ts user=solus_writer")

# Tags to ingest -- (PI tag name, friendly name, unit)
TAGS = [
    ("CDU1.C203.TT101.PV",   "C203_Column_Temp_Top_degC",       "degC"),
    ("CDU1.C203.TT102.PV",   "C203_Column_Temp_Bottom_degC",    "degC"),
    ("CDU1.C203.PT201.PV",   "C203_Column_Pressure_kgcm2",      "kg/cm2"),
    ("CDU1.C203.FT301.PV",   "C203_Feed_Flow_m3hr",             "m3/hr"),
    ("CDU1.C203.LT401.PV",   "C203_Bottom_Level_percent",       "%"),
    ("CDU1.T114.PT001.PV",   "T114_Tank_Pressure_kgcm2",        "kg/cm2"),
    ("CDU1.T114.LT001.PV",   "T114_Tank_Level_percent",         "%"),
    ("CDU1.K101.SPEED.PV",   "K101_Compressor_Speed_RPM",       "RPM"),
    ("CDU1.K101.VIB_DE.PV",  "K101_Compressor_Vib_DE_mm_s",    "mm/s"),
    ("UTIL.STEAM.HP_HDR.PV", "HP_Steam_Header_Pressure_kgcm2", "kg/cm2"),
]

INGEST_INTERVAL_SECONDS = 60
BATCH_WINDOW_SECONDS    = 60

SESSION = requests.Session()
SESSION.auth = (PI_USERNAME, PI_PASSWORD)
SESSION.verify = False
import urllib3
urllib3.disable_warnings()


def fetch_pi_values(tag, lookback_s=BATCH_WINDOW_SECONDS):
    """Returns list of {ts, value} from PI historian for the given tag."""
    end   = datetime.now(timezone.utc)
    start = end.replace(second=max(end.second - lookback_s, 0))
    url = (
        f"{PI_BASE_URL}/streams/{tag}/recorded"
        f"?startTime={start.isoformat()}&endTime={end.isoformat()}&maxCount=1000"
    )
    try:
        resp = SESSION.get(url, timeout=10)
        resp.raise_for_status()
        items = resp.json().get("Items", [])
        return [{"ts": i["Timestamp"],
                 "value": i.get("Value", {}).get("Value") or i.get("Value")}
                for i in items if "Value" in i]
    except Exception as exc:
        logger.warning(f"PI fetch failed for {tag}: {exc}")
        return []


def get_pg_conn():
    return psycopg2.connect(PG_DSN)


def ensure_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id         BIGSERIAL PRIMARY KEY,
                tag_name   TEXT        NOT NULL,
                friendly   TEXT,
                unit       TEXT,
                ts         TIMESTAMPTZ NOT NULL,
                value      DOUBLE PRECISION,
                ingest_ts  TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_sensor_tag_ts ON sensor_readings(tag_name, ts DESC);
        """)
    conn.commit()
    logger.info("Table sensor_readings OK")


def write_readings(conn, rows):
    """rows = [(tag_name, friendly, unit, ts, value), ...]"""
    if not rows:
        return
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO sensor_readings (tag_name, friendly, unit, ts, value) VALUES %s "
            "ON CONFLICT DO NOTHING",
            rows
        )
    conn.commit()
    logger.info(f"Wrote {len(rows)} sensor readings to PostgreSQL")


def run_ingest():
    logger.info("Starting ingest cycle...")
    all_rows = []
    for tag, friendly, unit in TAGS:
        points = fetch_pi_values(tag)
        for pt in points:
            all_rows.append((tag, friendly, unit, pt["ts"], pt["value"]))

    if not all_rows:
        logger.warning("No data fetched -- PI server unreachable or no new values.")
        return

    try:
        conn = get_pg_conn()
        ensure_table(conn)
        write_readings(conn, all_rows)
        conn.close()
    except Exception as exc:
        logger.error(f"Database write failed: {exc}")


if __name__ == "__main__":
    logger.info("Sensor Ingest Service starting -- polling every %d seconds",
                INGEST_INTERVAL_SECONDS)
    run_ingest()
    schedule.every(INGEST_INTERVAL_SECONDS).seconds.do(run_ingest)
    while True:
        schedule.run_pending()
        time.sleep(1)
''')

make_md(UPLOADS / "it/ws1/ingest_pipeline_runbook.md", """# Ingest Pipeline Runbook -- sensor_ingest.py
**BPCL Mumbai Refinery | IT Automation Team**
Doc ID: IT-RB-2026-008 | Owner: Solus IT Module | Last updated: 2026-09-01

## 1. Service Overview
`sensor_ingest.py` reads real-time process tag data from the OSIsoft PI Historian
(PI Web API) and writes it to the internal `refinery_ts` PostgreSQL database
at 60-second intervals. Downstream consumers: Solus dashboards, predictive maintenance ML models.

## 2. Environment Setup
```bash
cd /opt/bpcl/ingest
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Fill in PI_PASSWORD and PG_DSN
```

## 3. Running the Service
```bash
# Foreground (dev/debug)
python sensor_ingest.py

# Production (systemd)
sudo systemctl start sensor-ingest
sudo systemctl enable sensor-ingest
sudo journalctl -u sensor-ingest -f
```

## 4. Key Configuration (.env)

| Variable | Description | Default |
|---|---|---|
| `PI_BASE_URL` | PI Web API base URL | http://pi-server.bpcl.internal/piwebapi |
| `PI_USERNAME` | PI read-only service account | svc_solus_readonly |
| `PI_PASSWORD` | PI password (REQUIRED) | -- |
| `PG_DSN` | PostgreSQL DSN string | see .env.example |

## 5. Tag Naming Convention
Format: `<UNIT>.<EQUIPMENT>.<INSTRUMENT>.<SUFFIX>`
Example: `CDU1.C203.TT101.PV` = CDU1, Column C-203, Temperature Transmitter 101, Process Value

## 6. Troubleshooting

### PI Server unreachable
```
WARNING sensor_ingest - PI fetch failed for CDU1.C203.TT101.PV: ConnectionError
```
Check: `ping pi-server.bpcl.internal` and `curl -k -u svc_solus_readonly:PASSWORD http://pi-server.bpcl.internal/piwebapi`

### PostgreSQL connection error
```
ERROR sensor_ingest - Database write failed: could not connect to server
```
Check PG_DSN in `.env` and verify PostgreSQL service: `systemctl status postgresql`

## 7. Data Retention
PostgreSQL `sensor_readings` table partitioned by month.
Partitions older than 24 months archived to MinIO (on-premise S3-compatible).
Retention: Hot (PG): 24 months | Archive (MinIO): 7 years
""")

make_md(UPLOADS / "it/ws1/test_report.md", """# Test Report -- Solus API Integration Tests
**Project**: Solus AI Workbench -- FastAPI Backend
**Test Date**: 2026-09-08
**Environment**: BPCL Dev Server (bpcl-dev-01.internal:4000)

---

## Summary

| Category | Total | Passed | Failed |
|---|---|---|---|
| Auth and JWT | 8 | 8 | 0 |
| Workspace API | 12 | 12 | 0 |
| Knowledge Base | 10 | 9 | 1 |
| Chat Sessions | 6 | 6 | 0 |
| Agent Runs | 8 | 8 | 0 |
| Network Watchdog | 4 | 4 | 0 |
| File Upload | 6 | 5 | 1 |
| **TOTAL** | **54** | **52** | **2** |

**Pass rate: 96.3%** PASS

---

## Failed Tests

### KB-009: KB search returns cross-role results
**Status**: FAIL
**Test**: `GET /api/kb/search?q=API+570&collection=inspection` authenticated as hse_user
**Expected**: 403 Forbidden or empty result
**Actual**: 3 results returned from inspection collection
**Priority**: P1 -- Security fix required
**Fix PR**: #142 (role-scoped KB -- in review)

### FILE-006: Large file upload (>50 MB) times out
**Status**: FAIL
**Test**: Upload 62 MB PDF to `/api/files/upload`
**Expected**: 200 OK with file metadata
**Actual**: 504 Gateway Timeout after 30 seconds
**Priority**: P2 -- Chunked upload needed

---

## Detailed Results

### Auth and JWT (8/8 passed)
- PASS AUTH-001: Login with valid credentials -> JWT issued
- PASS AUTH-002: Login with wrong password -> 401
- PASS AUTH-003: Access protected route without token -> 401
- PASS AUTH-004: Access protected route with expired token -> 401
- PASS AUTH-005: GET /auth/me returns correct user object
- PASS AUTH-006: JWT sub is string (not integer) -- python-jose compliant
- PASS AUTH-007: Demo accounts endpoint returns all 6 users
- PASS AUTH-008: bcrypt verification works (passlib-free implementation)

### Network Watchdog (4/4 passed)
- PASS NET-001: GET /api/network/stats returns wan_outbound_bytes = 0
- PASS NET-002: Air-gap status = SECURE with no outbound connections
- PASS NET-003: WAN bytes counter increments if external connection opened (simulated)
- PASS NET-004: Sovereignty badge shows correct byte count in frontend
""")

# =============================================================================
# KNOWLEDGE BASE -- RICH TEXT FILES FOR HYBRID RAG
# =============================================================================
print("\n=== KNOWLEDGE BASE TEXT FILES ===")

kb_files = {
"inspection/API-570-digest.txt": """API 570 PIPING INSPECTION CODE -- BPCL QUICK REFERENCE (4th Ed.)
================================================================

INSPECTION INTERVALS (Table 7.1):
Class 1 (highly corrosive/toxic/high-pressure): External annually; UT survey 5-year max; 10% CML weld coverage.
Class 2 (normal hydrocarbon/process service): External 5-year; UT survey 10-year max.
Class 3 (low-pressure utility service): External 10-year; UT survey 10-year (risk extension to 15 years allowed).

MINIMUM WALL THICKNESS FORMULA (Section 5.7):
  t_min = (P x D) / (2 x S x E + 2 x P x Y)
  P = design pressure (psig)
  D = OD (inches)
  S = allowable stress (psi) from ASME B31.3 Table A-1
  E = joint quality factor (0.8-1.0)
  Y = 0.4 for ferritic steel below 900 degF

RETIREMENT THICKNESS: t_ret = t_min + corrosion allowance
REMAINING LIFE formula: RL = (t_actual - t_min) / corrosion_rate_per_year

CORROSION RATES -- CRUDE REFINERY SERVICE (Table A-2):
  CS in crude overhead (HCl environment): 0.1-0.3 mm per year
  CS in atmospheric residue: 0.05-0.15 mm per year
  SS 316L in sulfidic service above 260 degC: 0.01-0.05 mm per year
  Duplex SS in sour water stripper: 0.01-0.02 mm per year

INJECTION POINT INSPECTION (Section 7.3.3):
  Enhanced monitoring: upstream 12 inches + downstream elbow + 2 straight lengths
  RT or phased-array UT at 6-month intervals if active corrosion
  Baseline: minimum 5 UT readings per CML at commissioning

BPCL INTERNAL STANDARD: ME-0042 -- Bolting and Torque Procedures
BPCL INTERNAL STANDARD: ME-PM-0088 -- Piping Inspection Programme
""",

"inspection/SOP-HSE-114.txt": """SOP-HSE-114 Rev 4 -- SAFE ISOLATION AND DEPRESSURISATION OF PRESSURE VESSELS
=============================================================================
Doc No: SOP-HSE-114 | Owner: Head of Inspection and Integrity | Date: 01 Apr 2024

PREREQUISITES:
  (a) Valid Permit to Work (PTW) signed by Area Authority, displayed at work site
  (b) All process connections isolated: minimum double-block-and-bleed OR spade plates
  (c) Relief valve upstream block valve LOCKED OPEN, padlock, tag LOTOTO-BLUE
  (d) Pressure gauge at ZERO or atmospheric for minimum 15 continuous minutes
  (e) Gas test completed:
      O2: 19.5-23.5% vol
      Hydrocarbons (LEL): less than 10% LEL
      H2S: less than 5 ppm (TWA 1 ppm, STEL 5 ppm per OSHA)
      CO: less than 25 ppm

MAXIMUM DEPRESSURISATION RATE: 0.5 kg/cm2 per minute (prevents implosion of thin-walled vessels)
ENTRY TEMPERATURE LIMIT: below 50 degC (thermocouple probe -- verify calibration date)
NITROGEN PURGE VOLUME: minimum 3 vessel volumes for H2S service before entry
H2S EVACUATION THRESHOLD: 5 ppm -- evacuate 25-metre radius, notify HSE duty officer

EMERGENCY CONTACTS:
  HSE Duty Officer: +91-22-4001-XXXX (24x7)
  Fire Station: +91-22-4001-YYYY (2 minutes response time within refinery)
  Medical Centre: Gate 3 -- open 24x7

FORMS:
  Confined Space Entry Permit: Form HSE-F-009
  Hot Work Permit: Form HSE-F-003
  Work at Height Permit: Form HSE-F-007
""",

"inspection/inspection_archive_C203_2023.txt": """HISTORICAL INSPECTION ARCHIVE -- COLUMN C-203 (CDU-1, BPCL MUMBAI REFINERY)
===========================================================================
Equipment Tag: C-203 | Type: Crude Atmospheric Distillation Column
Design pressure: 4.2 kg/cm2g | Operating pressure: 2.8 kg/cm2g
Design temperature: 385 degC | Material: Carbon Steel SA-516-70
Nominal wall thickness: 12 mm (shell) | Year installed: 2003

THICKNESS SURVEY HISTORY -- SHELL COURSE 3 (Critical location):
  2019 (IR-2019-007): 10.6 mm | Rate N/A | Status SATISFACTORY
  2020 (IR-2020-011): 10.1 mm | Rate 0.50 mm/yr | Status MONITOR
  2021 (IR-2021-009): 9.8 mm  | Rate 0.30 mm/yr | Status MONITOR, coating recommended
  2022 (IR-2022-014): 9.5 mm  | Rate 0.30 mm/yr | Pitting 1.0 mm depth, coating applied
  2023 (IR-2023-018): 9.2 mm  | Rate 0.30 mm/yr | Manway scoring, retorqued
  2026 (IR-2026-014): 9.1 mm  | Rate 0.033 mm/yr (3-yr gap) | Status MONITOR
Weighted average corrosion rate: 0.214 mm per year (2019-2026)
API 570 minimum wall thickness (MWT): 8.0 mm
Remaining thickness above MWT: 9.1 minus 8.0 = 1.1 mm
Estimated remaining life: 1.1 divided by 0.214 = 5.1 years
Next statutory inspection: August 2028 (within remaining life - compliant)

INSPECTION FINDINGS SUMMARY:
  Corrosion: Shell Course 3 - general atmospheric, progressive, monitored since 2020
  Manhole Flange: Scoring on raised face, 0.5-0.8 mm depth, re-face at next shutdown
  Nozzle N-7: Pitting on reinforcement pad, max 1.2 mm depth, within ASME VIII Appendix 3 limits

APPLICABLE STANDARDS: API 510, API 570, ASME Sec VIII Div.1, IS 2825:1969, BPCL ME-0042
STATUTORY CERTIFICATE: PESO-CERT-2026-0883 | Inspecting Officer: R. Iyer (API-510 #12034)
""",

"process/process_basics.txt": """PROCESS ENGINEERING REFERENCE -- CDU-1 BPCL MUMBAI REFINERY
==========================================================

CDU-1 OVERVIEW:
Capacity: 12 MMTPA (design) | Current throughput: 11.4 MMTPA (Q3 FY2026)
Crude mix: 65% Arab Light (33 API, 1.9% S), 35% Bombay High (39 API, 0.15% S)
Pre-flash column: C-201 (removes lights before main heater)
Atmospheric heater: F-101 (4 passes, design 385 degC outlet)
Main column: C-203 (38 trays, 2 pump-arounds, 4 side draws)

KEY PRODUCT CUTS AND DRAW TEMPERATURES:
  LPG overhead: below 35 degC
  Naphtha side draw 1: 35-175 degC
  Kerosene/ATF side draw 2: 175-250 degC
  Gas Oil/HSD side draw 3: 250-375 degC
  Atmospheric Residue bottom: above 375 degC

RELIEF VALVE SIZING -- API 520 KEY EQUATIONS:
For fire case: Q = 43,200 x F x A^0.82 (BTU/hr)
Required flow: W = Q divided by latent_heat_in_BTU_per_lb
Orifice designations (API 526 in cm2): D=0.71, E=1.26, F=1.98, G=3.24, H=5.06, J=8.29,
  K=11.86, L=18.41, M=23.23, N=28.00, P=41.16, Q=71.29, R=103.23, T=167.74

COLUMN C-203 DESIGN DATA:
Operating pressure: 2.8 kg/cm2g | Design pressure: 4.2 kg/cm2g
Top temperature: 120 degC | Bottom temperature: 330 degC
Design reflux ratio: 3.2:1 | Current reflux ratio: 3.4:1 (adjusted for ATF spec)
Number of theoretical stages: 18 (efficiency test, April 2025)

ENERGY -- CDU-1 SPECIFIC CONSUMPTION:
Design: 60 MBTU/MT | Current: 62.4 MBTU/MT (Q3 FY2026)
F-101 heater efficiency: 89.2% (design: 91.5%) -- decoking scheduled Oct 2026
TEMA fouling factor allowance for main exchangers: 0.0002 hr.ft2.degF/BTU
""",

"process/relief_valve_standards.txt": """RELIEF AND SAFETY VALVE STANDARDS REFERENCE -- BPCL PROCESS ENGINEERING
=======================================================================

API STANDARD 520 -- SIZING, SELECTION, AND INSTALLATION (8th Edition):
Fire case formula: Q = 43,200 x F x A^0.82
F = 1.0 (no insulation, no drainage), 0.9 (adequate drainage), 0.3 (approved fireproofing + drainage)
A = wetted surface area in ft2 (use actual wetted area up to 25 feet above grade)

Back pressure limits:
  Conventional valves: 10% of set pressure maximum (built-up back pressure)
  Balanced bellows: 30% of set pressure maximum
  Pilot-operated: up to 50% of set pressure with non-flowing pilots

API STANDARD 526 (7th Edition, 2017) -- FLANGED STEEL PRESSURE-RELIEF VALVES:
Standard orifice areas (cm2): D=0.71, E=1.26, F=1.98, G=3.24, H=5.06, J=8.29,
  K=11.86, L=18.41, M=23.23, N=28.00, P=41.16, Q=71.29, R=103.23, T=167.74

API STANDARD 521 (6th Edition, 2014) -- PRESSURE-RELIEVING AND DEPRESSURING SYSTEMS:
Relief scenarios: blocked outlet, fire case, cooling failure, instrument failure, etc.
Fire case: most common governing case for liquid-filled vessels
Flare system: maximum velocity Mach 0.5 at flare tip; design for worst-case simultaneous relief

ASME SECTION VIII DIVISION 1 -- PRESSURE VESSELS:
Accumulation: 10% over MAWP for single PRV; 16% for fire case (UG-125)
Hydrostatic test pressure: 1.3 x MAWP

BPCL INTERNAL STANDARD ME-0088 -- PSV INSPECTION AND TESTING:
  Conventional spring-loaded non-corrosive service: 5-year interval
  Balanced bellows corrosive/sour service: 3-year interval
  Pilot-operated clean service with clean pilot: 5-year with proof test
""",

"hse/incident_investigation.txt": """HSE INCIDENT INVESTIGATION PROCEDURES -- BPCL MUMBAI REFINERY
=============================================================
Procedure No: HSE-P-003 Rev 5 | Date: 01 Jan 2025

INCIDENT CLASSIFICATION:
Category 1 -- Near Miss / First Aid / Unsafe Act / Condition:
  Report within: 24 hours | Investigation: Area Supervisor + HSE Officer
  Root cause method: 5-Why analysis | CAPA closure: 30 days

Category 2 -- HIPO (High Potential Incident), Minor Injury, Property Damage above Rs 1 Lakh:
  Report within: 4 hours | Investigation: HOD + HSE Manager + Safety Committee
  Root cause method: Fault Tree Analysis + 5-Why | CAPA closure: 60 days

Category 3 -- LTI (Lost Time Injury), Major Property Damage, Environmental Release:
  Report within: 1 hour (to HOD, MD, MoPNG as applicable)
  Investigation: External expert + Internal team | CAPA closure: 90 days

NEAR MISS NM-0142 -- HYDROCARBON RELEASE (30-Aug-2026):
Location: CDU-1 Bay 4, Sample Point SP-201 (Column C-203 bottom)
Classification: Category 2 (HIPO)
Gas monitor AM-204 activated at 20% LEL (alarm threshold 10% LEL, evacuation 25% LEL)
Root cause: Sample valve packing worn, excluded from preventive maintenance scope
5-Why root cause: PM programme did not cover sample valves below 2-inch NPS
CAPA-1 (Immediate): All CDU-1 sample valve packing inspected, 3 additional flagged
CAPA-2 (Short-term): Revise PM checklist ME-PM-0088 to include all sample valves
CAPA-3 (Long-term): Engineering review for closed-loop sampling zero-emission

GAS MONITORING STANDARDS:
  O2 deficiency alarm: below 19.5% (OSHA 29 CFR 1910.146)
  O2 enrichment alarm: above 23.5%
  HC combustible gas: Alarm 10% LEL, Evacuation 25% LEL
  H2S: Alarm 1 ppm TWA, Action 5 ppm STEL per ACGIH, IDLH 50 ppm
  CO: Alarm 25 ppm TWA, STEL 100 ppm, IDLH 1200 ppm
""",

"hse/lsr_and_ptw.txt": """LIFE SAVING RULES AND PERMIT TO WORK SYSTEM -- BPCL REFINERY
=============================================================
LSR Version: 3.0 | PTW Procedure: HSE-P-001 Rev 8

LIFE SAVING RULES (LSR):
LSR-01 WORK PERMIT: Valid PTW mandatory for all non-routine work. Verbal permits invalid. Expired permit means stop work.
LSR-02 CONFINED SPACE: Entry Permit mandatory. Continuous gas monitor, standby man, rescue equipment required.
LSR-03 LOTO: Lock Out Tag Out mandatory. Verify zero energy. Test -- attempt start, verify pressure zero, drain energy.
LSR-04 HEIGHT: Fall protection mandatory above 1.8 metres. No work at height if wind above 40 km/hr.
LSR-05 HOT WORK: Hot Work Permit mandatory. Gas test below 5% LEL within 5 minutes of starting. Continuous monitoring.
LSR-06 DRIVING: 25 km/hr plant speed limit. Seat belt. No mobile phone use. No fatigue driving.
LSR-07 ALCOHOL AND DRUGS: Zero tolerance. Random testing. Violation means immediate termination and criminal referral.
LSR-08 BYPASS SAFETY SYSTEMS: Never bypass SIS, fire/gas detection, PSV, ESD without formal MoC and PTW.

PTW SYSTEM:
Types: General (cold work), Hot Work, Confined Space Entry, Work at Height, Electrical Isolation, Radiation
Validity: Maximum 12 hours (one shift). Extend only with Area Authority written approval.
CSEP additional requirements: Gas test for O2 + HC + H2S + CO, continuous monitor, retrieval harness, standby man

EMERGENCY EVACUATION:
CDU-1 muster: Gate 3 (primary), Tank Farm East Road (secondary)
All-site alarm: 3 long blasts on siren
Head count: Area HSE Officer, confirmed to control room within 5 minutes
""",

"procurement/vendor_evaluation.txt": """VENDOR EVALUATION AND PROCUREMENT PROCEDURES -- BPCL MUMBAI REFINERY
====================================================================
Procedure: PROC-P-002 Rev 6 | Date: 01 Mar 2024

PROCUREMENT THRESHOLDS:
  Below Rs 5 Lakhs: Single quotation, Engineer approval
  Rs 5-50 Lakhs: Minimum 3 quotations, HOD approval plus Finance concurrence
  Rs 50 Lakhs to 5 Crore: Open tender (NIT), Procurement Committee approval
  Above Rs 5 Crore: Global tender, Board approval required

VENDOR QUALIFICATION CRITERIA (Rotating Equipment):
  Financial: Net worth above Rs 5 Cr; no adverse credit history
  Technical: Minimum 3 similar installations in Indian refineries or petrochemicals
  Quality: ISO 9001:2015 certification; PESO approval for pressure equipment
  Delivery: FAT facility; documented MTBF data
  After-sales: Authorised service centre within 200 km OR guaranteed 48-hour response

EVALUATION WEIGHTAGE (BPCL Standard):
  Technical compliance: 40%
  Price (total cost of ownership over 10 years): 30%
  Delivery period: 15%
  Vendor experience and references: 10%
  After-sales support: 5%

LIQUIDATED DAMAGES:
  Delay in delivery: 0.5% of PO value per week, maximum 5%

COMPRESSOR PROCUREMENT -- RFQ-2026-0441:
Equipment: Air compressor, 90 kW, 16.5 m3/min FAD at 7.5 bar(g), VSD type
Specifications per IS 5456, ASME B19.1, API 619 (refinery service)
IE3 motor efficiency mandatory (Bureau of Energy Efficiency requirement)
Noise: 73 dB(A) at 1 metre maximum (CPCB Noise Rules 2000)

VENDOR QUOTES RECEIVED (RFQ-2026-0441):
  Atlas Copco GA90VSD+: Rs 38.4 Lakhs ex-works + 18% GST; delivery 12 weeks; warranty 24 months
  Kirloskar KC-90-7.5: Rs 31.2 Lakhs ex-works + 18% GST; delivery 8 weeks; warranty 18 months
  Ingersoll Rand R90ie: Rs 35.8 Lakhs ex-works + 18% GST; delivery 10 weeks; warranty 24 months
  Energy efficiency (kW per m3/min at full load): Atlas 5.45, Kirloskar 5.82, Ingersoll 5.61
  Documented MTBF: Atlas 45,000 hr; Kirloskar 38,000 hr; Ingersoll 42,000 hr
  RECOMMENDATION: Atlas Copco GA90VSD+ -- best total cost of ownership, lowest energy intensity
""",

"procurement/contract_law.txt": """CONTRACT MANAGEMENT AND PROCUREMENT LAW -- BPCL REFERENCE
==========================================================

APPLICABLE LAW:
  General Contracts: Indian Contract Act, 1872
  Government Procurement (PSUs): CVC Guidelines, General Financial Rules 2017
  Arbitration: Arbitration and Conciliation Act, 1996 (2015 amendment)
  GST: CGST Act 2017

BPCL STANDARD PURCHASE ORDER TERMS:
  Price: Firm and fixed. No escalation unless CPI/WPI clause explicitly agreed in writing.
  Payment: 30% advance against Bank Guarantee; 60% on dispatch plus inspection certificate; 10% after commissioning
  Warranty: Commences date of commissioning OR 12 months from dispatch (whichever is earlier)
  Title: Passes to Buyer on delivery at site
  Force Majeure: Excludes supplier's financial difficulty, strikes at supplier facility, foreseeable events
  Governing Law: Laws of India. Seat of arbitration: Mumbai
  Jurisdiction: Courts of Mumbai only

INSPECTION AND TESTING:
  Third-party inspection required for all pressure equipment (PESO certification)
  FAT mandatory for rotating equipment and control systems above Rs 10 Lakhs
  Written dispatch clearance from Buyer's Inspector before shipping

GST APPLICABILITY:
  Air compressors (HSN 8414): 18% GST
  Heat exchangers (HSN 8419): 18% GST
  Valves above 2-inch (HSN 8481): 18% GST
  Electrical motors (HSN 8501): 18% GST
  Instrumentation and control (HSN 9032): 18% GST

PERFORMANCE BANK GUARANTEE (PBG):
  Required for contracts above Rs 50 Lakhs
  Value: 10% of contract value
  Validity: Contract period plus 6 months
  From: Scheduled or nationalised bank; invocable on demand without demur
""",

"board/financial_governance.txt": """FINANCIAL GOVERNANCE FRAMEWORK -- BPCL MUMBAI REFINERY
======================================================
Doc: FIN-GOV-001 Rev 4 | Date: 01 Apr 2025

DELEGATED AUTHORITY LEVELS (Capital Expenditure):
  Shift Manager: Up to Rs 50,000 (emergency maintenance)
  Head of Department: Up to Rs 10 Lakhs (opex); up to Rs 5 Lakhs (capex)
  General Manager Refinery: Up to Rs 50 Lakhs (opex); up to Rs 25 Lakhs (capex)
  Executive Director: Up to Rs 2 Crore (opex); up to Rs 1 Crore (capex)
  Chairman and MD: Up to Rs 10 Crore (opex); up to Rs 5 Crore (capex)
  Board: Above Rs 5 Crore (capex) -- Board Resolution required

KEY FINANCIAL METRICS -- Q3 FY2026 REFINERY:
  Revenue: Rs 104,850 Crore | Net Profit: Rs 9,751 Crore | EBITDA: Rs 14,130 Crore
  GRM (Mumbai Refinery): USD 9.8 per bbl (Q3 FY2026) | Throughput: 2,84,000 MT
  Energy intensity: 62.4 MBTU per MT (Plan: 60.0; Gap: +4%)
  Solus AI Workbench annualised savings: Rs 41.3 Crore (94 users in pilot)
  EPS (Basic): Rs 21.13 (Q3 FY2026)
  EBITDA Margin: 13.4% (Q3 FY2026)

AI AND AUTOMATION INVESTMENT PROGRAMME:
  FY2026 sanctioned budget: Rs 148 Crore
  Deployed as of Q3: Rs 109.5 Crore (74%)
  Realised savings YTD: Rs 89.4 Crore annualised
  Payback: 19 months (revised from 24 months)
  IRR: 34% (revised from 28%)
  Supplementary budget request (Solus expansion): Rs 38.5 Crore -- Pending Board approval

SEBI DISCLOSURE REQUIREMENTS:
  Quarterly results within 60 days of quarter end
  Board meetings minimum 4 per year
  Related party transactions approval required if above Rs 1,000 Crore or 10% of turnover
""",

"board/strategy_and_governance.txt": """BPCL STRATEGIC PRIORITIES AND CORPORATE GOVERNANCE -- BOARD REFERENCE
====================================================================

CORPORATE STRATEGY FY2025-2030 (Project Ankur):
  Refining capacity: 12 MMTPA to 18 MMTPA (Bina Refinery expansion)
  Petrochemical integration: Rs 49,000 Crore investment plan
  Renewable energy: 1 GW solar + green hydrogen pilot at Kochi Refinery
  Digital transformation: Rs 1,200 Crore over 5 years -- AI, IoT, digital twin
  Global upstream: E&P acreage in 8 countries

DATA SOVEREIGNTY POLICY (MoPNG Circular DSP-2024-001):
  Critical operational and commercial data of Indian PSUs = STRATEGIC NATIONAL ASSETS
  Prohibition: Production quantities, GRM, unreleased contracts, P&ID drawings, safety assessments
    MUST NOT be processed on foreign cloud infrastructure
  Requirement: AI assistants for sensitive knowledge work MUST be self-hosted on-premises
    OR on Indian government cloud (MeghRaj) with data residency guarantees
  Enforcement: Annual CERT-In audit; non-compliance penalty Rs 5 Crore
  Solus compliance: Fully compliant -- all inference on-premise, air-gapped, no external API calls

ESG COMMITMENTS:
  Carbon intensity reduction: 10% by FY2028 (base FY2022)
  Flaring reduction: below 0.01% of throughput by FY2027 (currently 0.02%)
  Zero liquid discharge: All refineries by FY2026
  Diversity: 30% women in management by FY2030
""",

"it/python_standards.txt": """PYTHON CODING STANDARDS -- BPCL IT AUTOMATION TEAM
==================================================
Doc: IT-STD-001 Rev 3 | Date: 01 Jun 2025

CODE QUALITY REQUIREMENTS:
  Python version: 3.11+ minimum (3.12 recommended for new projects from 2025)
  Style: PEP 8 compliance enforced via ruff
  Type hints: Required for all public functions and class methods (PEP 484)
  Docstrings: Google-style for all modules, classes, and public functions
  Testing: pytest minimum 80% line coverage; mypy strict mode for new projects
  Security: bandit scan in CI pipeline; no hardcoded secrets (use .env + python-dotenv)

FASTAPI BACKEND STANDARDS:
  Framework: FastAPI 0.110+ with Pydantic v2 models
  Auth: JWT (python-jose) with HS256 for internal tools
  CORS: Restrict to known origins, never wildcard in production
  Logging: structured JSON logs via python-json-logger
  Async: Use async/await throughout; use httpx (not requests) for external calls

SENSOR DATA INGEST STANDARDS:
  PI Historian: PI Web API (REST) -- service account with READ-ONLY access
  Polling interval: 60 seconds minimum
  Storage: PostgreSQL with TimescaleDB extension for time-series
  Tag naming: UNIT.EQUIPMENT.INSTRUMENT.SUFFIX (e.g. CDU1.C203.TT101.PV)
  Data retention: Hot (PostgreSQL) 24 months; Archive (MinIO) 7 years
  Monitoring: Prometheus metrics; alert if zero readings in 10-minute window

SOLUS AI INTEGRATION:
  Ollama endpoint: http://localhost:11434 (LAN-only, never exposed to WAN)
  Model selection: phi4:latest (general), llava (vision), nomic-embed-text (embeddings)
  Embedding dimension: 768 (nomic-embed-text default)
  Inference timeout: 120 seconds hard limit; stream via SSE (Server-Sent Events)
  Air-gap verification: psutil socket monitoring -- alert if WAN outbound bytes above 0
""",

"it/security_standards.txt": """IT SECURITY AND CYBERSECURITY STANDARDS -- BPCL REFINERY
=======================================================
Doc: IT-SEC-001 Rev 5 | Date: 01 Jan 2025
Mandated by: MoPNG IT Security Guidelines, CERT-In Framework, ISO 27001

OT/IT SEGREGATION (MANDATORY):
  Process Control Network (PCN/OT): Physically isolated from Corporate IT network
  DMZ: Managed unidirectional data diode between OT and IT
  No direct internet access from OT network under any circumstances
  AI tools: Must be deployed in IT zone, never directly connected to OT
  Solus deployment zone: IT zone (segregated server farm, VLAN-isolated)

DATA CLASSIFICATION:
  LEVEL 1 PUBLIC: Marketing materials, press releases, annual report
  LEVEL 2 INTERNAL: Procedures, non-sensitive engineering documents
  LEVEL 3 CONFIDENTIAL: Financial data, vendor contracts, inspection reports, P&IDs
  LEVEL 4 RESTRICTED: ESD logic, SIS configuration, safety critical calculations
  Level 3 and Level 4: MUST NOT be processed by cloud AI tools (per DSP-2024-001)
  Solus AI Workbench: Certified for Level 3 processing; Level 4 under review

PASSWORD AND ACCESS CONTROL:
  Password policy: 12+ chars, complexity, 90-day rotation, no reuse (24 history)
  MFA: Mandatory for all remote access and all IT administrator accounts
  PAM: CyberArk deployed -- all admin sessions recorded
  Service accounts: Minimum required permissions; no interactive login; password rotated every 30 days

NETWORK SECURITY:
  Firewall: Palo Alto perimeter; Cisco ASA internal zones
  IDS/IPS: Deployed at perimeter and DMZ
  VPN: Cisco AnyConnect for remote users; split-tunnel PROHIBITED
  Wi-Fi: WPA3-Enterprise (802.1X); no personal devices on plant Wi-Fi
  Air-gap verification: Automated script checks outbound connections from Solus server daily

INCIDENT RESPONSE:
  CERT-In mandatory reporting: Within 6 hours for critical incidents
  Internal escalation: IT Security to CISO to MD to Board within 24 hours for major incidents
  Evidence preservation: Forensic image of affected systems before remediation
""",
}

for rel_path, content in kb_files.items():
    make_txt(KB / rel_path, content)

print("\n=== ALL DEMO ASSETS GENERATED SUCCESSFULLY ===")
print("  Inspection: 4 PDFs")
print("  Process:    1 XLSX + 1 PDF + 1 PPTX")
print("  HSE:        2 PDFs + 1 PDF (life_saving) + 1 XLSX")
print("  Procurement: 3 PDFs (vendor quotes) + 1 XLSX + 1 DOCX")
print("  Board:      1 XLSX + 1 PPTX + 1 PDF")
print("  IT:         1 PY + 2 MD files")
print("  KB txt:     12 rich text files across 6 roles")
