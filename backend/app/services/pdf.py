"""
PDF generation for contracts, invoices, receipts, and monthly statements.
Uses ReportLab (pure Python, no system-level dependencies) rather than an
HTML-to-PDF converter, since those typically need native libraries that are
painful to install reliably on Windows.

Every generator returns a BytesIO buffer ready to send via Flask's
send_file - nothing here touches the filesystem.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

BRAND_COLOR = colors.HexColor("#c2692f")
TEXT_COLOR = colors.HexColor("#292524")
MUTED_COLOR = colors.HexColor("#78716c")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="BrandTitle", fontSize=20, textColor=BRAND_COLOR, fontName="Helvetica-Bold", spaceAfter=2))
styles.add(ParagraphStyle(name="DocTitle", fontSize=14, textColor=TEXT_COLOR, fontName="Helvetica-Bold", spaceAfter=10))
styles.add(ParagraphStyle(name="Muted", fontSize=9, textColor=MUTED_COLOR))
styles.add(ParagraphStyle(name="MutedRight", fontSize=9, textColor=MUTED_COLOR, alignment=TA_RIGHT))
styles.add(ParagraphStyle(name="SectionHeading", fontSize=11, textColor=TEXT_COLOR, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle(name="BodySmall", fontSize=9.5, textColor=TEXT_COLOR, leading=14))
styles.add(ParagraphStyle(name="CenteredMuted", fontSize=8, textColor=MUTED_COLOR, alignment=TA_CENTER))


def _header(elements, doc_type_label):
    elements.append(Paragraph("Burley Events", styles["BrandTitle"]))
    elements.append(Paragraph("Nairobi, Kenya", styles["Muted"]))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(doc_type_label, styles["DocTitle"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_COLOR, spaceAfter=14))


def _footer_note(elements, text):
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e7e5e4"), spaceAfter=8))
    elements.append(Paragraph(text, styles["CenteredMuted"]))


def _build(elements):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    )
    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_invoice_pdf(invoice, client, quote=None):
    elements = []
    _header(elements, f"Invoice #{invoice.id}")

    meta_table = Table(
        [
            ["Billed to:", "Invoice date:"],
            [client.name if client else "-", invoice.created_at.strftime("%d %b %Y") if invoice.created_at else "-"],
            [client.email if client else "", f"Due: {invoice.due_date.strftime('%d %b %Y') if invoice.due_date else 'On receipt'}"],
        ],
        colWidths=[90 * mm, 70 * mm],
    )
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_COLOR),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(meta_table)

    elements.append(Paragraph("Services", styles["SectionHeading"]))
    rows = [["Description", "Qty", "Unit Price", "Total"]]
    if quote:
        for item in quote.items:
            rows.append([
                item.description, str(item.quantity),
                f"KES {float(item.unit_price):,.2f}", f"KES {float(item.total_price):,.2f}",
            ])
    else:
        rows.append(["Services as agreed", "1", f"KES {float(invoice.total_amount):,.2f}", f"KES {float(invoice.total_amount):,.2f}"])

    items_table = Table(rows, colWidths=[80 * mm, 20 * mm, 30 * mm, 30 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e7e5e4")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafaf9")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)

    elements.append(Spacer(1, 10))
    totals_table = Table(
        [
            ["Total", f"KES {float(invoice.total_amount):,.2f}"],
            ["Paid", f"KES {invoice.amount_paid:,.2f}"],
            ["Balance Due", f"KES {invoice.amount_outstanding:,.2f}"],
        ],
        colWidths=[130 * mm, 30 * mm],
    )
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("LINEABOVE", (0, 2), (-1, 2), 1, TEXT_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(totals_table)

    elements.append(Paragraph("Payment Schedule", styles["SectionHeading"]))
    sched_rows = [["Item", "Amount", "Due", "Status"]]
    for s in invoice.schedule_items:
        sched_rows.append([
            s.label.replace("_", " ").title(), f"KES {float(s.amount_due):,.2f}",
            s.due_date.strftime("%d %b %Y") if s.due_date else "-", s.status.title(),
        ])
    sched_table = Table(sched_rows, colWidths=[50 * mm, 40 * mm, 35 * mm, 35 * mm])
    sched_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e7e5e4")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(sched_table)

    _footer_note(elements, f"Generated {datetime.utcnow().strftime('%d %b %Y')} - Burley Events - Nairobi, Kenya")
    return _build(elements)


def generate_receipt_pdf(transaction, client=None, description=""):
    elements = []
    _header(elements, "Payment Receipt")

    info_rows = [
        ["Receipt for:", client.name if client else "-"],
        ["Amount received:", f"KES {float(transaction.amount):,.2f}"],
        ["Payment method:", (transaction.provider or "-").upper()],
        ["Reference:", transaction.provider_ref or transaction.account_reference or "-"],
        ["Date received:", transaction.confirmed_at.strftime("%d %b %Y, %H:%M") if transaction.confirmed_at else "-"],
        ["For:", description or "Payment"],
    ]
    info_table = Table(info_rows, colWidths=[45 * mm, 115 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_COLOR),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        f'<font size="14"><b>Amount Paid: KES {float(transaction.amount):,.2f}</b></font>',
        ParagraphStyle(name="Amount", textColor=BRAND_COLOR, spaceBefore=10),
    ))

    _footer_note(elements, f"This receipt confirms payment was received. Generated {datetime.utcnow().strftime('%d %b %Y')} - Burley Events")
    return _build(elements)


def generate_contract_pdf(event, quote, client):
    elements = []
    _header(elements, "Event Services Agreement")

    elements.append(Paragraph(
        '<font color="#b45309"><b>DRAFT TEMPLATE - This document has not been reviewed by a lawyer. '
        "Review and adapt the terms below (especially cancellation, refund, and liability clauses) "
        "with a qualified legal professional before using it as a binding contract.</b></font>",
        ParagraphStyle(name="Disclaimer", fontSize=8.5, textColor=colors.HexColor("#b45309"),
                       backColor=colors.HexColor("#fef3c7"), borderPadding=8, leading=12),
    ))
    elements.append(Spacer(1, 14))

    elements.append(Paragraph(
        f"This agreement is between <b>Burley Events</b> (\"the Planner\") and "
        f"<b>{client.name if client else 'the Client'}</b> (\"the Client\") for event planning "
        f"and coordination services as described below.",
        styles["BodySmall"],
    ))

    elements.append(Paragraph("Event Details", styles["SectionHeading"]))
    details_rows = [
        ["Client", client.name if client else "-"],
        ["Event date", event.event_date.strftime("%d %b %Y") if event.event_date else "To be confirmed"],
        ["Venue", event.venue or "To be confirmed"],
        ["Guest count", str(event.guest_count) if event.guest_count else "To be confirmed"],
    ]
    details_table = Table(details_rows, colWidths=[45 * mm, 115 * mm])
    details_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(details_table)

    elements.append(Paragraph("Services Included", styles["SectionHeading"]))
    if quote:
        rows = [["Service", "Total"]]
        for item in quote.items:
            rows.append([item.description, f"KES {float(item.total_price):,.2f}"])
        rows.append(["Total Contract Value", f"KES {quote.total_price:,.2f}"])
        services_table = Table(rows, colWidths=[130 * mm, 30 * mm])
        services_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("LINEABOVE", (0, -1), (-1, -1), 1, TEXT_COLOR),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e7e5e4")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(services_table)
    else:
        elements.append(Paragraph("Services to be confirmed via a separate quote.", styles["BodySmall"]))

    elements.append(Paragraph("Terms & Conditions (Draft)", styles["SectionHeading"]))
    terms = [
        "1. Payment Schedule: Payment shall be made according to the schedule set out in the "
        "associated invoice. Services are confirmed only once the applicable deposit or payment "
        "has been received in full.",
        "2. Cancellation by Client: [Placeholder - define notice period and refund percentage, "
        "e.g. cancellations more than 60 days before the event receive a partial refund of the "
        "deposit; cancellations within 30 days are non-refundable. Confirm with legal counsel.]",
        "3. Cancellation by Planner: In the unlikely event the Planner must cancel due to "
        "circumstances beyond reasonable control, a full refund of amounts paid will be issued.",
        "4. Changes to Scope: Any changes to guest count, venue, or services after this agreement "
        "is signed may result in a revised quote and updated invoice.",
        "5. Liability: [Placeholder - define the Planner's liability limits for third-party vendor "
        "performance, venue conditions, and force majeure events. Confirm with legal counsel.]",
        "6. Governing Law: This agreement is governed by the laws of the Republic of Kenya.",
    ]
    for t in terms:
        elements.append(Paragraph(t, styles["BodySmall"]))
        elements.append(Spacer(1, 6))

    elements.append(Spacer(1, 20))
    sig_table = Table(
        [["_________________________", "_________________________"],
         ["Burley Events", client.name if client else "Client"],
         [f"Date: ____________", "Date: ____________"]],
        colWidths=[80 * mm, 80 * mm],
    )
    sig_table.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 1), (-1, 1), 4)]))
    elements.append(sig_table)

    _footer_note(elements, f"Draft generated {datetime.utcnow().strftime('%d %b %Y')} - not valid until reviewed and signed")
    return _build(elements)


def generate_monthly_statement_pdf(year, month, month_label, stats):
    elements = []
    _header(elements, f"Monthly Statement - {month_label}")

    summary_rows = [
        ["Revenue", f"KES {stats['revenue']:,.2f}"],
        ["Expenses", f"KES {stats['expenses']:,.2f}"],
        ["Staff Payouts", f"KES {stats['staff_payouts']:,.2f}"],
        ["Vendor Costs", f"KES {stats['vendor_costs']:,.2f}"],
        ["Net Profit", f"KES {stats['net_profit']:,.2f}"],
    ]
    summary_table = Table(summary_rows, colWidths=[100 * mm, 60 * mm])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10.5),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, TEXT_COLOR),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(summary_table)

    elements.append(Paragraph("Invoices Issued This Month", styles["SectionHeading"]))
    inv_rows = [["Invoice #", "Client", "Amount", "Status"]]
    for inv in stats["invoices"]:
        inv_rows.append([f"#{inv['id']}", inv["client_name"], f"KES {inv['amount']:,.2f}", inv["status"].title()])
    if len(inv_rows) == 1:
        inv_rows.append(["-", "No invoices this month", "-", "-"])
    inv_table = Table(inv_rows, colWidths=[25 * mm, 70 * mm, 35 * mm, 30 * mm])
    inv_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f4")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e7e5e4")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(inv_table)

    _footer_note(elements, f"Generated {datetime.utcnow().strftime('%d %b %Y')} - Burley Events - for bookkeeping purposes")
    return _build(elements)
