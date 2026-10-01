from io import BytesIO

def generate_pdf_report(session_id: str, candidate_name: str, exam_title: str, total_score: float, max_score: float, section_scores: dict, integrity_score: float, flags: list, answers_detail: list) -> bytes:
    # Dummy reportlab integration
    buffer = BytesIO()
    buffer.write(b"%PDF-1.4 Mock PDF for " + str(session_id).encode())
    return buffer.getvalue()
