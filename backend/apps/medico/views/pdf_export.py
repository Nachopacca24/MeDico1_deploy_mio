# apps/medico/views/pdf_export.py

import io
import logging
from datetime import date

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
    HRFlowable, KeepTogether,
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

    surg_data = [
        [Paragraph('Hospital', S['label']), Paragraph('Fecha', S['label']),
         Paragraph('Hora', S['label'])],
        [Paragraph(f'<b>{hospital_name}</b>', S['body']), Paragraph(date_str, S['body']),
         Paragraph(time_range, S['body'])],
        [Paragraph('Cirujano', S['label']), Paragraph('Ayudante', S['label']),
         Paragraph('', S['label'])],
        [Paragraph(surgeon_name, S['body']), Paragraph(assistant, S['body']),
         Paragraph('', S['body'])],
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
    procedures = case.procedures.all().order_by('order')
    if procedures.exists():
        story.append(Paragraph('PROCEDIMIENTOS', S['section']))

        if include_hospital_factor:
            headers = ['#', 'Código', 'Procedimiento', 'Especialidad', 'RVU',
                       f'Factor\n{case.hospital.name[:15] if case.hospital else "Hospital"}',
                       'Valor']
            col_w = [0.3*inch, 0.8*inch, 2.1*inch, 1.0*inch, 0.5*inch, 0.7*inch, 0.8*inch]
        else:
            headers = ['#', 'Código', 'Procedimiento', 'Especialidad', 'RVU', 'Valor']
            col_w = [0.3*inch, 0.9*inch, 2.4*inch, 1.2*inch, 0.6*inch, 0.85*inch]

        proc_data = [[Paragraph(h, S['label']) for h in headers]]

        total_rvu   = 0
        total_value = 0

        for i, proc in enumerate(procedures, 1):
            rvu   = float(proc.rvu or 0)
            val   = float(proc.calculated_value or 0)
            total_rvu   += rvu
            total_value += val

            row = [
                Paragraph(str(i), S['body']),
                Paragraph(proc.surgery_code or '—', S['body']),
                Paragraph(proc.surgery_name or '—', S['body']),
                Paragraph(proc.specialty or '—', S['body']),
                Paragraph(f'{rvu:.2f}', S['body']),
            ]
            if include_hospital_factor:
                row.append(Paragraph(f'{float(proc.hospital_factor or 0):.2f}', S['body']))
            row.append(Paragraph(f'Q {val:,.2f}', S['body']))
            proc_data.append(row)

        # Totals row
        if include_hospital_factor:
            totals_row = [
                Paragraph('', S['body']), Paragraph('', S['body']),
                Paragraph('TOTAL', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)),
                Paragraph('', S['body']),
                Paragraph(f'{total_rvu:.2f}', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)),
                Paragraph('', S['body']),
                Paragraph(f'Q {total_value:,.2f}', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_AMBER)),
            ]
        else:
            totals_row = [
                Paragraph('', S['body']), Paragraph('', S['body']),
                Paragraph('TOTAL', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)),
                Paragraph('', S['body']),
                Paragraph(f'{total_rvu:.2f}', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_DARK)),
                Paragraph(f'Q {total_value:,.2f}', ParagraphStyle('tb', fontSize=9, fontName='Helvetica-Bold', textColor=C_AMBER)),
            ]
        proc_data.append(totals_row)

        proc_table = Table(proc_data, colWidths=col_w, repeatRows=1)
        last = len(proc_data) - 1
        proc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), C_MID),
            ('TEXTCOLOR', (0, 0), (-1, 0), C_LIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, last - 1), [C_WHITE, C_LIGHT]),
            ('BACKGROUND', (0, last), (-1, last), colors.HexColor('#fef3c7')),  # amber-100
            ('GRID', (0, 0), (-1, -1), 0.4, C_BORDER),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ]))
        story.append(proc_table)
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            f'RVU Total: <b>{total_rvu:.2f}</b> &nbsp;&nbsp;|&nbsp;&nbsp; '
            f'Honorario Total: <b>Q {total_value:,.2f}</b>',
            ParagraphStyle('sum', fontSize=10, textColor=C_AMBER,
                           fontName='Helvetica-Bold', alignment=TA_RIGHT)
        ))

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
    return user.plan == 'premium' or user.is_permanent_premium


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
            .prefetch_related('procedures')
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
        .prefetch_related('procedures')
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
