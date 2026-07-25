# apps/medico/views/pdf_export.py

import io
import logging
import time
import urllib.request
from datetime import date

import cloudinary.utils

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image as RLImage,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from ..models import SurgicalCase
from ..crypto_utils import decrypt_field

logger = logging.getLogger(__name__)

# ── Colores ────────────────────────────────────────────────────────────────────
C_DARK    = colors.HexColor('#0f172a')   # slate-900
C_MID     = colors.HexColor('#1e293b')   # slate-800
C_BORDER  = colors.HexColor('#334155')   # slate-700
C_MUTED   = colors.HexColor('#64748b')   # slate-500
C_AMBER   = colors.HexColor('#f59e0b')   # amber-400
C_WHITE   = colors.white
C_LIGHT   = colors.HexColor('#f8fafc')   # slate-50
C_GREEN   = colors.HexColor('#22c55e')
C_RED     = colors.HexColor('#ef4444')


def _styles():
    base = getSampleStyleSheet()
    return {
        'title': ParagraphStyle('title', fontSize=20, textColor=C_DARK,
                                fontName='Helvetica-Bold', spaceAfter=2),
        'subtitle': ParagraphStyle('subtitle', fontSize=9, textColor=C_MUTED,
                                   fontName='Helvetica', spaceAfter=0),
        'section': ParagraphStyle('section', fontSize=10, textColor=C_AMBER,
                                  fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4),
        'body': ParagraphStyle('body', fontSize=9, textColor=C_DARK,
                               fontName='Helvetica', leading=14),
        'label': ParagraphStyle('label', fontSize=8, textColor=C_MUTED,
                                fontName='Helvetica', spaceAfter=1),
        'small': ParagraphStyle('small', fontSize=7.5, textColor=C_MUTED,
                                fontName='Helvetica'),
        'footer': ParagraphStyle('footer', fontSize=7, textColor=C_MUTED,
                                 fontName='Helvetica', alignment=TA_CENTER),
        'total': ParagraphStyle('total', fontSize=10, textColor=C_DARK,
                                fontName='Helvetica-Bold'),
    }


def _status_label(s):
    return {
        'scheduled': 'Programado',
        'completed': 'Completado',
        'billed': 'Facturado',
        'paid': 'Pagado',
        'cancelled': 'Cancelado',
    }.get(s, s.capitalize())


def _gender_label(g):
    return {'M': 'Masculino', 'F': 'Femenino', 'O': 'Otro'}.get(g or '', '—')


def _fmt_date(d):
    if not d:
        return '—'
    if isinstance(d, str):
        return d
    return d.strftime('%d/%m/%Y')


def _fmt_time(t):
    if not t:
        return ''
    return t.strftime('%H:%M')


def _build_case_story(case, include_hospital_factor: bool, styles: dict) -> list:
    """Build the reportlab flowables for one surgical case."""
    story = []
    S = styles

    # ── Header block ──────────────────────────────────────────────────────────
    status_text = _status_label(case.status)
    title_cell = Paragraph(
        '<b>Reporte Quirúrgico</b><br/>'
        '<font size="8" color="#64748b">MeDico App · Registro médico quirúrgico</font>',
        ParagraphStyle('hdr_title', fontSize=20, textColor=C_DARK,
                       fontName='Helvetica-Bold', leading=26, spaceAfter=0),
    )
    status_cell = Paragraph(
        f'Estado: <b>{status_text}</b>',
        ParagraphStyle('hdr_status', fontSize=9, textColor=C_MUTED,
                       fontName='Helvetica', alignment=TA_RIGHT),
    )
    header_table = Table([[title_cell, status_cell]], colWidths=[4 * inch, 3 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width='100%', thickness=1.5, color=C_AMBER, spaceAfter=10))

    # ── Patient info ──────────────────────────────────────────────────────────
    story.append(Paragraph('INFORMACIÓN DEL PACIENTE', S['section']))

    patient_name = decrypt_field(case.patient_name) or '—'
    patient_id   = decrypt_field(case.patient_id)   or '—'
    age_str      = str(case.patient_age) + ' años' if case.patient_age else '—'
    gender_str   = _gender_label(case.patient_gender)

    pat_data = [
        [Paragraph('Paciente', S['label']), Paragraph('ID / Expediente', S['label']),
         Paragraph('Edad', S['label']), Paragraph('Género', S['label'])],
        [Paragraph(f'<b>{patient_name}</b>', S['body']), Paragraph(patient_id, S['body']),
         Paragraph(age_str, S['body']), Paragraph(gender_str, S['body'])],
    ]
    pat_table = Table(pat_data, colWidths=[2.5 * inch, 1.8 * inch, 1 * inch, 1.2 * inch])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [C_WHITE]),
    ]))
    story.append(pat_table)
    story.append(Spacer(1, 8))

    # ── Surgery info ──────────────────────────────────────────────────────────
    story.append(Paragraph('INFORMACIÓN DE LA CIRUGÍA', S['section']))

    hospital_name = case.hospital.name if case.hospital else '—'
    surgeon_name  = f'{case.created_by.get_full_name() or case.created_by.email}'
    assistant     = '—'
    if case.assistant_doctor:
        assistant = case.assistant_doctor.get_full_name() or case.assistant_doctor.email
    elif case.assistant_doctor_name:
        assistant = case.assistant_doctor_name

    date_str  = _fmt_date(case.surgery_date)
    time_str  = _fmt_time(case.surgery_time)
    etime_str = _fmt_time(case.surgery_end_time)
    time_range = f'{time_str} – {etime_str}' if time_str and etime_str else time_str or '—'

    insurance = (case.insurance_company.name if case.insurance_company else '—')

    surg_data = [
        [Paragraph('Hospital', S['label']), Paragraph('Fecha', S['label']),
         Paragraph('Hora', S['label'])],
        [Paragraph(f'<b>{hospital_name}</b>', S['body']), Paragraph(date_str, S['body']),
         Paragraph(time_range, S['body'])],
        [Paragraph('Cirujano', S['label']), Paragraph('Ayudante', S['label']),
         Paragraph('Seguro médico', S['label'])],
        [Paragraph(surgeon_name, S['body']), Paragraph(assistant, S['body']),
         Paragraph(insurance, S['body'])],
    ]
    surg_table = Table(surg_data, colWidths=[2.5 * inch, 1.8 * inch, 2.2 * inch])
    surg_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
        ('BACKGROUND', (0, 2), (-1, 2), C_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('SPAN', (0, 2), (0, 2)),
    ]))
    story.append(surg_table)
    story.append(Spacer(1, 8))

    # ── Diagnosis / Notes ─────────────────────────────────────────────────────
    diagnosis = decrypt_field(case.diagnosis)
    notes     = decrypt_field(case.notes)

    if diagnosis:
        story.append(Paragraph('DIAGNÓSTICO', S['section']))
        story.append(Paragraph(diagnosis, S['body']))
        story.append(Spacer(1, 6))

    if notes:
        story.append(Paragraph('NOTAS ADICIONALES', S['section']))
        story.append(Paragraph(notes, S['body']))
        story.append(Spacer(1, 6))

    # ── Procedures table ──────────────────────────────────────────────────────
    MULTI_MULTIPLIERS = [1.0, 0.5, 0.25, 0.10]

    procedures = list(case.procedures.all().order_by('order'))
    if procedures:
        story.append(Paragraph('PROCEDIMIENTOS', S['section']))

        procs_count = len(procedures)
        use_multi = procs_count > 1

        # Sort by value desc to assign multiple-rule ranks
        ranked = sorted(enumerate(procedures), key=lambda x: float(x[1].rvu or 0), reverse=True)
        rank_map = {orig_i: rank for rank, (orig_i, _) in enumerate(ranked)}
        pct_labels = ['100%', '50%', '25%', '10%']

        if include_hospital_factor:
            headers = ['#', 'Código', 'Procedimiento', 'Especialidad', 'RVU',
                       f'Factor\n{case.hospital.name[:15] if case.hospital else "Hospital"}',
                       'Valor base', 'Regla múlt.', 'Honorario']
            col_w = [0.25*inch, 0.7*inch, 1.6*inch, 0.8*inch, 0.45*inch, 0.6*inch, 0.7*inch, 0.6*inch, 0.7*inch]
        else:
            headers = ['#', 'Código', 'Procedimiento', 'Especialidad', 'RVU', 'Valor base', 'Regla múlt.', 'Honorario']
            col_w = [0.25*inch, 0.75*inch, 1.9*inch, 0.95*inch, 0.5*inch, 0.75*inch, 0.65*inch, 0.75*inch]

        proc_data = [[Paragraph(h, S['label']) for h in headers]]

        total_rvu        = 0
        total_value      = 0
        total_multi      = 0

        for i, proc in enumerate(procedures):
            rvu     = float(proc.rvu or 0)
            val     = float(proc.calculated_value or 0)
            rank    = rank_map.get(i, i)
            mult    = MULTI_MULTIPLIERS[min(rank, len(MULTI_MULTIPLIERS) - 1)]
            multi_v = val * mult
            pct     = pct_labels[min(rank, len(pct_labels) - 1)]

            total_rvu   += rvu
            total_value += val
            total_multi += multi_v

            multi_style = ParagraphStyle('mp', fontSize=8, fontName='Helvetica-Bold',
                                         textColor=C_AMBER if mult == 1.0 else C_MUTED)
            row = [
                Paragraph(str(i + 1), S['body']),
                Paragraph(proc.surgery_code or '—', S['body']),
                Paragraph(proc.surgery_name or '—', S['body']),
                Paragraph(proc.specialty or '—', S['body']),
                Paragraph(f'{rvu:.2f}', S['body']),
            ]
            if include_hospital_factor:
                row.append(Paragraph(f'{float(proc.hospital_factor or 0):.2f}', S['body']))
            row.append(Paragraph(f'Q {val:,.2f}', S['body']))
            row.append(Paragraph(pct, multi_style))
            row.append(Paragraph(f'Q {multi_v:,.2f}',
                                 ParagraphStyle('mv', fontSize=8, fontName='Helvetica-Bold',
                                                textColor=C_AMBER if mult == 1.0 else C_DARK)))
            proc_data.append(row)

        # Totals row
        tb = ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)
        ta = ParagraphStyle('ta', fontSize=9, fontName='Helvetica-Bold', textColor=C_AMBER)
        empty = Paragraph('', S['body'])
        base_cols = [empty, empty,
                     Paragraph('TOTAL', tb), empty,
                     Paragraph(f'{total_rvu:.2f}', tb)]
        if include_hospital_factor:
            base_cols.append(empty)
        base_cols += [
            Paragraph(f'Q {total_value:,.2f}', tb),
            empty,
            Paragraph(f'Q {total_multi:,.2f}', ta),
        ]
        proc_data.append(base_cols)

        proc_table = Table(proc_data, colWidths=col_w, repeatRows=1)
        last = len(proc_data) - 1
        proc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_MID),
            ('TEXTCOLOR', (0, 0), (-1, 0), C_LIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, last - 1), [C_WHITE, C_LIGHT]),
            ('BACKGROUND', (0, last), (-1, last), colors.HexColor('#fef3c7')),
            ('GRID', (0, 0), (-1, -1), 0.4, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ]))
        story.append(proc_table)
        story.append(Spacer(1, 4))

        if use_multi:
            story.append(Paragraph(
                f'RVU Total: <b>{total_rvu:.2f}</b> &nbsp;|&nbsp; '
                f'Valor base: <b>Q {total_value:,.2f}</b> &nbsp;|&nbsp; '
                f'<font color="#f59e0b">Honorario con regla múltiple: <b>Q {total_multi:,.2f}</b></font>',
                ParagraphStyle('sum', fontSize=9, textColor=C_AMBER,
                               fontName='Helvetica-Bold', alignment=TA_RIGHT)
            ))
        else:
            story.append(Paragraph(
                f'RVU Total: <b>{total_rvu:.2f}</b> &nbsp;|&nbsp; '
                f'Honorario Total: <b>Q {total_value:,.2f}</b>',
                ParagraphStyle('sum', fontSize=10, textColor=C_AMBER,
                               fontName='Helvetica-Bold', alignment=TA_RIGHT)
            ))

    # ── Anesthesia section (for surgeon's PDF — no fee) ───────────────────────
    try:
        anesthesia = case.anesthesia
        items = list(anesthesia.items.all())
        if anesthesia.anesthesiologist or items or anesthesia.time_minutes:
            story.append(Paragraph('ANESTESIA', S['section']))
            anest_name = '—'
            if anesthesia.anesthesiologist:
                anest_name = anesthesia.anesthesiologist.get_full_name() or anesthesia.anesthesiologist.email
            elif anesthesia.anesthesiologist_name:
                anest_name = anesthesia.anesthesiologist_name
            story.append(Paragraph(f'Anestesiólogo: <b>{anest_name}</b>', S['body']))
            story.append(Spacer(1, 4))

            if items:
                anest_data = [[Paragraph(h, S['label']) for h in ['Código', 'Procedimiento', 'Unidades base']]]
                for item in items:
                    anest_data.append([
                        Paragraph(item.surgery_code or '—', S['body']),
                        Paragraph(item.surgery_name or '—', S['body']),
                        Paragraph(f'{float(item.base_units):.2f}', S['body']),
                    ])
                anest_table = Table(anest_data, colWidths=[0.9*inch, 4.5*inch, 1.1*inch])
                anest_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), C_MID),
                    ('TEXTCOLOR', (0, 0), (-1, 0), C_LIGHT),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('GRID', (0, 0), (-1, -1), 0.4, C_BORDER),
                    ('PADDING', (0, 0), (-1, -1), 4),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [C_WHITE, C_LIGHT]),
                ]))
                story.append(anest_table)
                story.append(Spacer(1, 4))

            if anesthesia.time_minutes:
                story.append(Paragraph(
                    f'Tiempo de anestesia: <b>{anesthesia.time_minutes} min</b> '
                    f'({float(anesthesia.time_units or 0):.0f} unidades)',
                    S['body'],
                ))
                story.append(Spacer(1, 4))
    except Exception:
        pass  # no anesthesia session exists

    # ── Surgeon equipment (informational only) ────────────────────────────────
    if case.equipment_name or case.equipment_cost:
        story.append(Paragraph('USO DE EQUIPO PERSONAL', S['section']))
        eq_rows = [
            [Paragraph('Equipo', S['label']), Paragraph('Costo (informativo)', S['label'])],
            [Paragraph(case.equipment_name or '—', S['body']),
             Paragraph(f'Q {float(case.equipment_cost or 0):,.2f}' if case.equipment_cost else '—', S['body'])],
        ]
        eq_table = Table(eq_rows, colWidths=[4.5 * inch, 2 * inch])
        eq_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(eq_table)
        story.append(Paragraph(
            'Nota: el costo del equipo es informativo y no se incluye en el honorario.',
            ParagraphStyle('eq_note', fontSize=7.5, textColor=C_MUTED, fontName='Helvetica', spaceAfter=4),
        ))
        story.append(Spacer(1, 4))

    # ── Surgery images ────────────────────────────────────────────────────────
    images = list(case.images.all())
    if images:
        story.append(Spacer(1, 8))
        story.append(Paragraph('IMÁGENES DE LA CIRUGÍA', S['section']))

        MAX_W = 3.2 * inch
        MAX_H = 2.8 * inch
        img_cells = []

        pdf_expires_at = int(time.time()) + 300  # signed URL valid for 5 min (PDF generation only)
        for img_obj in images:
            try:
                if img_obj.cloudinary_public_id:
                    fetch_url, _ = cloudinary.utils.cloudinary_url(
                        img_obj.cloudinary_public_id,
                        type='authenticated',
                        sign_url=True,
                        expires_at=pdf_expires_at,
                        secure=True,
                    )
                else:
                    fetch_url = img_obj.cloudinary_url  # legacy public image
                with urllib.request.urlopen(fetch_url, timeout=10) as resp:
                    img_bytes = io.BytesIO(resp.read())
                rl_img = RLImage(img_bytes, width=MAX_W, height=MAX_H, kind='proportional')
                caption = Paragraph(
                    img_obj.original_filename or f'Imagen {img_obj.id}',
                    ParagraphStyle('img_cap', fontSize=7, textColor=C_MUTED,
                                   fontName='Helvetica', alignment=TA_CENTER, spaceAfter=0),
                )
                img_cells.append([rl_img, caption])
            except Exception as e:
                logger.warning('[PDF] could not fetch image=%s: %s', img_obj.id, e)

        # 2 columns
        for i in range(0, len(img_cells), 2):
            pair = img_cells[i:i + 2]
            if len(pair) == 1:
                pair.append(['', ''])
            row_imgs    = [pair[0][0], pair[1][0]]
            row_caps    = [pair[0][1], pair[1][1]]
            img_table = Table(
                [row_imgs, row_caps],
                colWidths=[3.5 * inch, 3.5 * inch],
            )
            img_table.setStyle(TableStyle([
                ('ALIGN',   (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('GRID',    (0, 0), (-1, -1), 0.4, C_BORDER),
                ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
            ]))
            story.append(img_table)
            story.append(Spacer(1, 6))

    return story


def _build_anesthesia_story(case, anesthesia, styles: dict) -> list:
    """Story para el PDF privado del anestesiólogo."""
    story = []
    S = styles

    # ── Header ────────────────────────────────────────────────────────────────
    title_cell = Paragraph(
        '<b>Reporte de Anestesia</b><br/>'
        '<font size="8" color="#64748b">MeDico App · Registro de honorarios de anestesia</font>',
        ParagraphStyle('hdr_title', fontSize=20, textColor=C_DARK,
                       fontName='Helvetica-Bold', leading=26, spaceAfter=0),
    )
    status_cell = Paragraph(
        f'Estado: <b>{_status_label(case.status)}</b>',
        ParagraphStyle('hdr_status', fontSize=9, textColor=C_MUTED,
                       fontName='Helvetica', alignment=TA_RIGHT),
    )
    header_table = Table([[title_cell, status_cell]], colWidths=[4 * inch, 3 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width='100%', thickness=1.5, color=C_AMBER, spaceAfter=10))

    # ── Patient info ──────────────────────────────────────────────────────────
    story.append(Paragraph('INFORMACIÓN DEL PACIENTE', S['section']))
    patient_name = decrypt_field(case.patient_name) or '—'
    patient_id   = decrypt_field(case.patient_id)   or '—'
    age_str      = str(case.patient_age) + ' años' if case.patient_age else '—'
    gender_str   = _gender_label(case.patient_gender)
    pat_data = [
        [Paragraph('Paciente', S['label']), Paragraph('ID / Expediente', S['label']),
         Paragraph('Edad', S['label']), Paragraph('Género', S['label'])],
        [Paragraph(f'<b>{patient_name}</b>', S['body']), Paragraph(patient_id, S['body']),
         Paragraph(age_str, S['body']), Paragraph(gender_str, S['body'])],
    ]
    pat_table = Table(pat_data, colWidths=[2.5*inch, 1.8*inch, 1*inch, 1.2*inch])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pat_table)
    story.append(Spacer(1, 8))

    # ── Surgery info ──────────────────────────────────────────────────────────
    story.append(Paragraph('INFORMACIÓN DE LA CIRUGÍA', S['section']))
    hospital_name = case.hospital.name if case.hospital else '—'
    surgeon_name  = case.created_by.get_full_name() or case.created_by.email
    date_str  = _fmt_date(case.surgery_date)
    time_str  = _fmt_time(case.surgery_time)
    etime_str = _fmt_time(case.surgery_end_time)
    time_range = f'{time_str} – {etime_str}' if time_str and etime_str else time_str or '—'
    surg_data = [
        [Paragraph('Hospital', S['label']), Paragraph('Fecha', S['label']), Paragraph('Hora', S['label'])],
        [Paragraph(f'<b>{hospital_name}</b>', S['body']), Paragraph(date_str, S['body']), Paragraph(time_range, S['body'])],
        [Paragraph('Cirujano principal', S['label']), Paragraph('Anestesiólogo', S['label']), Paragraph('', S['label'])],
        [Paragraph(surgeon_name, S['body']),
         Paragraph(anesthesia.anesthesiologist.get_full_name() or anesthesia.anesthesiologist.email, S['body']),
         Paragraph('', S['body'])],
    ]
    surg_table = Table(surg_data, colWidths=[2.5*inch, 2.5*inch, 1.5*inch])
    surg_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
        ('BACKGROUND', (0, 2), (-1, 2), C_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(surg_table)
    story.append(Spacer(1, 8))

    # ── Anesthesia codes ──────────────────────────────────────────────────────
    items = list(anesthesia.items.all())
    story.append(Paragraph('PROCEDIMIENTOS DE ANESTESIA', S['section']))
    if items:
        anest_data = [[Paragraph(h, S['label']) for h in ['Código', 'Procedimiento', 'Unidades base']]]
        total_base = 0
        for item in items:
            base = float(item.base_units)
            total_base += base
            anest_data.append([
                Paragraph(item.surgery_code or '—', S['body']),
                Paragraph(item.surgery_name or '—', S['body']),
                Paragraph(f'{base:.2f}', S['body']),
            ])
        tb = ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)
        anest_data.append([Paragraph('', S['body']), Paragraph('TOTAL BASE', tb), Paragraph(f'{total_base:.2f}', tb)])
        anest_table = Table(anest_data, colWidths=[0.9*inch, 4.5*inch, 1.1*inch])
        anest_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_MID),
            ('TEXTCOLOR', (0, 0), (-1, 0), C_LIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.4, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [C_WHITE, C_LIGHT]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fef3c7')),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ]))
        story.append(anest_table)
    else:
        story.append(Paragraph('Sin procedimientos de anestesia registrados.', S['body']))
    story.append(Spacer(1, 8))

    # ── Time section ──────────────────────────────────────────────────────────
    story.append(Paragraph('TIEMPO DE ANESTESIA', S['section']))
    if anesthesia.time_minutes:
        time_data = [
            [Paragraph('Minutos', S['label']), Paragraph('Unidades de tiempo', S['label'])],
            [Paragraph(f'<b>{anesthesia.time_minutes} min</b>', S['body']),
             Paragraph(f'<b>{float(anesthesia.time_units or 0):.0f} uds</b>', S['body'])],
        ]
        time_table = Table(time_data, colWidths=[2*inch, 4.5*inch])
        time_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(time_table)
    else:
        story.append(Paragraph('Tiempo de anestesia no registrado.', S['body']))
    story.append(Spacer(1, 8))

    # ── Equipment (anesthesiologist) ──────────────────────────────────────────
    if anesthesia.equipment_name or anesthesia.equipment_cost:
        story.append(Paragraph('EQUIPO DE ANESTESIA', S['section']))
        eq_rows = [
            [Paragraph('Equipo', S['label']), Paragraph('Costo (Q)', S['label'])],
            [Paragraph(anesthesia.equipment_name or '—', S['body']),
             Paragraph(f'Q {float(anesthesia.equipment_cost or 0):,.2f}', S['body'])],
        ]
        eq_table = Table(eq_rows, colWidths=[4.5 * inch, 2 * inch])
        eq_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(eq_table)
        story.append(Spacer(1, 8))

    # ── Financial summary (private — anesthesiologist only) ───────────────────
    story.append(Paragraph('RESUMEN DE HONORARIOS', S['section']))
    total_base_u  = float(anesthesia.total_base_units)
    time_u        = float(anesthesia.time_units or 0)
    total_u       = total_base_u + time_u
    unit_val      = float(anesthesia.unit_value)
    base_fee      = total_u * unit_val
    equipment_fee = float(anesthesia.equipment_cost or 0)
    total_fee     = base_fee + equipment_fee

    fin_rows = [
        [Paragraph('Unidades base', S['label']), Paragraph('Unidades tiempo', S['label']),
         Paragraph('Total unidades', S['label']), Paragraph('Valor por unidad (Q)', S['label']),
         Paragraph('Honorario base (Q)', S['label'])],
        [Paragraph(f'{total_base_u:.2f}', S['body']), Paragraph(f'{time_u:.0f}', S['body']),
         Paragraph(f'<b>{total_u:.2f}</b>', S['body']), Paragraph(f'Q {unit_val:,.2f}', S['body']),
         Paragraph(f'<b>Q {base_fee:,.2f}</b>', S['body'])],
    ]
    fin_table = Table(fin_rows, colWidths=[1.1*inch, 1.1*inch, 1.1*inch, 1.3*inch, 1.8*inch])
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 1), (-1, -1), 'RIGHT'),
    ]))
    story.append(fin_table)
    story.append(Spacer(1, 4))

    if equipment_fee > 0:
        story.append(Paragraph(
            f'Equipo de anestesia: <b>Q {equipment_fee:,.2f}</b>',
            ParagraphStyle('eq_line', fontSize=9, textColor=C_DARK, fontName='Helvetica', alignment=TA_RIGHT),
        ))

    total_style = ParagraphStyle('total_fee', fontSize=11, fontName='Helvetica-Bold',
                                 textColor=C_AMBER, alignment=TA_RIGHT, spaceBefore=4)
    story.append(Paragraph(f'HONORARIO TOTAL: Q {total_fee:,.2f}', total_style))

    return story


def _generate_pdf(cases, include_hospital_factor: bool, doctor_name: str) -> bytes:
    """Render all cases into a single PDF and return bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    S = _styles()
    story = []

    for idx, case in enumerate(cases):
        if idx > 0:
            from reportlab.platypus import PageBreak
            story.append(PageBreak())
        case_story = _build_case_story(case, include_hospital_factor, S)
        story.extend(case_story)

    # Footer on every page
    today = date.today().strftime('%d/%m/%Y')

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(C_MUTED)
        footer = (
            f'Generado el {today} · MeDico App · '
            f'Documento confidencial — {doctor_name}'
        )
        canvas.drawCentredString(letter[0] / 2, 0.4 * inch, footer)
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(0.75 * inch, 0.55 * inch, letter[0] - 0.75 * inch, 0.55 * inch)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buffer.getvalue()


# ── Views ──────────────────────────────────────────────────────────────────────

def _check_premium(user):
    return user.has_premium_access


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_case_pdf(request, case_id):
    """Export a single surgical case as PDF. Premium only."""
    if not _check_premium(request.user):
        return Response(
            {'error': 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para exportar PDF.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    include_factor = request.query_params.get('include_factor', 'true').lower() != 'false'

    try:
        case = (
            SurgicalCase.objects
            .select_related('hospital', 'created_by', 'assistant_doctor')
            .prefetch_related('procedures', 'images')
            .get(pk=case_id, created_by=request.user)
        )
    except SurgicalCase.DoesNotExist:
        return Response({'error': 'Caso no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    doctor_name = request.user.get_full_name() or request.user.email
    logger.info('[PDF] user=%s exporting case=%s', request.user.id, case_id)

    try:
        pdf_bytes = _generate_pdf([case], include_factor, doctor_name)
    except Exception as e:
        logger.error('[PDF] generation error case=%s: %s', case_id, e, exc_info=True)
        return Response({'error': 'Error al generar el PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # [SECURITY] Never expose patient name in filename — use generic identifier
    filename = f'cirugia_{case.id}_{case.surgery_date or "sin_fecha"}.pdf'

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_anesthesia_pdf(request, case_id):
    """Export anesthesia PDF for the anesthesiologist of a case."""
    if not _check_premium(request.user):
        return Response(
            {'error': 'Reactiva Premium para exportar PDF.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    from ..models.anesthesia import AnesthesiaCase
    try:
        anesthesia = (
            AnesthesiaCase.objects
            .select_related('case__hospital', 'case__created_by', 'anesthesiologist')
            .prefetch_related('items')
            .get(
                case__pk=case_id,
                anesthesiologist=request.user,
                anesthesiologist_accepted=True,
            )
        )
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'Caso de anestesia no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    case = anesthesia.case
    doctor_name = request.user.get_full_name() or request.user.email
    S = _styles()
    story = _build_anesthesia_story(case, anesthesia, S)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=0.75*inch, leftMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch,
    )
    today = date.today().strftime('%d/%m/%Y')

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(C_MUTED)
        canvas.drawCentredString(
            letter[0] / 2, 0.4*inch,
            f'Generado el {today} · MeDico App · Documento confidencial — {doctor_name}'
        )
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(0.75*inch, 0.55*inch, letter[0] - 0.75*inch, 0.55*inch)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    pdf_bytes = buffer.getvalue()

    filename = f'anestesia_{case.id}_{case.surgery_date or "sin_fecha"}.pdf'
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    logger.info('[PDF] anesthesia user=%s case=%s', request.user.id, case_id)
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_cases_bulk_pdf(request):
    """Export multiple surgical cases as a single merged PDF. Premium only."""
    if not _check_premium(request.user):
        return Response(
            {'error': 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para exportar PDF.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    case_ids = request.data.get('case_ids', [])
    if not case_ids or not isinstance(case_ids, list):
        return Response({'error': 'Enviá una lista de case_ids'}, status=status.HTTP_400_BAD_REQUEST)
    if len(case_ids) > 50:
        return Response({'error': 'Máximo 50 casos por exportación'}, status=status.HTTP_400_BAD_REQUEST)
    # [SECURITY] Validate all IDs are positive integers to prevent malformed input
    try:
        case_ids = [int(cid) for cid in case_ids if int(cid) > 0]
    except (ValueError, TypeError):
        return Response({'error': 'case_ids debe ser una lista de números enteros'}, status=status.HTTP_400_BAD_REQUEST)
    if not case_ids:
        return Response({'error': 'No se enviaron IDs válidos'}, status=status.HTTP_400_BAD_REQUEST)

    include_factor = request.data.get('include_factor', True)

    cases = (
        SurgicalCase.objects
        .select_related('hospital', 'created_by', 'assistant_doctor')
        .prefetch_related('procedures', 'images')
        .filter(pk__in=case_ids, created_by=request.user)
        .order_by('surgery_date')
    )

    if not cases.exists():
        return Response({'error': 'No se encontraron casos'}, status=status.HTTP_404_NOT_FOUND)

    doctor_name = request.user.get_full_name() or request.user.email
    logger.info('[PDF] user=%s bulk export cases=%s', request.user.id, case_ids)

    try:
        pdf_bytes = _generate_pdf(list(cases), include_factor, doctor_name)
    except Exception as e:
        logger.error('[PDF] bulk generation error: %s', e, exc_info=True)
        return Response({'error': 'Error al generar el PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    today = date.today().strftime('%Y-%m-%d')
    filename = f'cirugias_{today}_{cases.count()}_casos.pdf'

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
