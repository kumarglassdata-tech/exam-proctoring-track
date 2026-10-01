def evaluate_mcq(answer_response: str, correct_answer: str, marks: float, negative_marks: float) -> float:
    if answer_response == correct_answer:
        return marks
    elif answer_response:
        return -negative_marks
    return 0.0

def evaluate_numerical(answer_response: str, correct_answer: str, tolerance: float, marks: float) -> float:
    try:
        ans = float(answer_response)
        corr = float(correct_answer)
        if abs(ans - corr) <= tolerance:
            return marks
    except (ValueError, TypeError):
        pass
    return 0.0

def evaluate_paragraph_answer(candidate_text: str, model_answer: str, threshold: float, marks: float):
    # Backward compatibility for paragraph type
    res = evaluate_descriptive_answer(candidate_text, model_answer, marks)
    return res["score"], res["similarity"]

def evaluate_descriptive_answer(
    candidate_text: str,
    model_answer: str,
    marks: float,
    min_words: int = 50,
    max_words: int = 500,
) -> dict:
    """
    Automated evaluation for descriptive questions:
    - Length & completeness check (word count vs min/max requirements)
    - Keyword & core concept overlap against the recruiter's model answer
    - Semantic density scoring
    - Actionable rubric feedback
    """
    import re

    if not candidate_text or not candidate_text.strip():
        return {
            "score": 0.0,
            "max_marks": marks,
            "word_count": 0,
            "similarity": 0.0,
            "feedback": "No response provided.",
            "is_correct": False,
        }

    words = re.findall(r'\b\w+\b', candidate_text.lower())
    word_count = len(words)

    # 1. Length ratio
    length_multiplier = 1.0
    if min_words > 0 and word_count < min_words:
        length_multiplier = max(0.3, word_count / min_words)

    # 2. Key concept extraction from model answer
    model_words = set(re.findall(r'\b\w{4,}\b', (model_answer or "").lower()))
    stop_words = {"this", "that", "with", "from", "have", "were", "been", "which", "there", "their", "about", "would", "could", "should"}
    meaningful_model_words = model_words - stop_words

    cand_words_set = set(words)
    if meaningful_model_words:
        matched = meaningful_model_words.intersection(cand_words_set)
        coverage_ratio = len(matched) / len(meaningful_model_words)
    else:
        coverage_ratio = 0.75

    # 3. Blended semantic quality score (0.0 to 1.0)
    quality_score = min(1.0, (coverage_ratio * 0.7) + (min(1.0, word_count / max(1, min_words)) * 0.3))
    final_score = round(marks * quality_score * length_multiplier, 2)

    feedback_notes = []
    if word_count < min_words:
        feedback_notes.append(f"Brief response ({word_count}/{min_words} words).")
    else:
        feedback_notes.append(f"Good length ({word_count} words).")

    if coverage_ratio >= 0.65:
        feedback_notes.append("High coverage of core concepts.")
    elif coverage_ratio >= 0.35:
        feedback_notes.append("Partial coverage of expected technical points.")
    else:
        feedback_notes.append("Missing several critical concepts from model answer.")

    return {
        "score": final_score,
        "max_marks": marks,
        "word_count": word_count,
        "similarity": round(quality_score, 2),
        "feedback": " ".join(feedback_notes),
        "is_correct": final_score >= (marks * 0.5),
    }

def compute_integrity_score(flags: list) -> float:
    deductions = {"low": 1.0, "medium": 5.0, "high": 20.0, "critical": 50.0}
    score = 100.0
    for flag in flags:
        score -= deductions.get(flag.get("severity"), 0.0)
    return max(0.0, score)
