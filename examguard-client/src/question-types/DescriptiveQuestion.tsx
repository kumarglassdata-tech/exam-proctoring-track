import React, { useState } from 'react';
import { Question } from '../lib/types';

interface DescriptiveQuestionProps {
  question: Question;
  value: string;
  onChange: (val: string) => void;
}

// Rough word count for the live counter
function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function DescriptiveQuestion({
  question,
  value,
  onChange,
}: DescriptiveQuestionProps) {
  const [focused, setFocused] = useState(false);
  const words = countWords(value);
  const chars = value.length;
  const minWords = question.min_words ?? 50;
  const maxWords = question.max_words ?? 500;
  const progress = Math.min(1, words / minWords);
  const isEnough = words >= minWords;

  return (
    <div style={styles.container}>
      {/* Question prompt */}
      <div style={styles.prompt}>
        <div style={styles.promptLabel}>
          📝 Descriptive Answer &nbsp;·&nbsp; {question.marks} marks
          {question.negative_marks ? ` · −${question.negative_marks} negative` : ''}
        </div>
        <div style={styles.questionText}>{question.text}</div>

        {/* Word limit guidance */}
        <div style={styles.guidancePills}>
          <span style={styles.pill}>Min: {minWords} words</span>
          <span style={styles.pill}>Max: {maxWords} words</span>
          {question.difficulty && (
            <span
              style={{
                ...styles.pill,
                background:
                  question.difficulty === 'easy'
                    ? 'rgba(16,185,129,0.15)'
                    : question.difficulty === 'hard'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(245,158,11,0.15)',
                color:
                  question.difficulty === 'easy'
                    ? '#10b981'
                    : question.difficulty === 'hard'
                    ? '#f87171'
                    : '#fbbf24',
              }}
            >
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Answer area */}
      <div style={styles.editorWrap}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Write your detailed answer here. Be clear, structured, and support your points with relevant examples or reasoning..."
          spellCheck
          style={{
            ...styles.textarea,
            borderColor: focused
              ? isEnough
                ? '#10b981'
                : '#6366f1'
              : 'rgba(255,255,255,0.1)',
            boxShadow: focused
              ? `0 0 0 2px ${isEnough ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`
              : 'none',
          }}
        />

        {/* Footer stats bar */}
        <div style={styles.footer}>
          <div style={styles.statsRow}>
            <span style={{ color: isEnough ? '#10b981' : '#94a3b8' }}>
              {words} / {minWords}+ words
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{chars} characters</span>
          </div>

          {/* Progress bar towards min words */}
          <div style={styles.progressBg}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.min(100, progress * 100)}%`,
                background: isEnough
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #6366f1, #4f46e5)',
              }}
            />
          </div>

          {words > maxWords && (
            <div style={styles.warning}>
              ⚠ Answer exceeds {maxWords} words. Please trim your response.
            </div>
          )}

          {isEnough && (
            <div style={styles.successHint}>
              ✓ Minimum word count reached
            </div>
          )}
        </div>
      </div>

      {/* Writing tips */}
      <div style={styles.tipsCard}>
        <div style={styles.tipsTitle}>💡 Writing Tips</div>
        <ul style={styles.tipsList}>
          <li>Start with a clear topic sentence or thesis.</li>
          <li>Support each point with examples, data, or reasoning.</li>
          <li>Use structured paragraphs: intro → body → conclusion.</li>
          <li>Avoid bullet points unless explicitly asked.</li>
          <li>Review for grammar before moving to the next question.</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    height: '100%',
  },
  prompt: {
    background: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12,
    padding: '18px 20px',
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    lineHeight: 1.7,
    marginBottom: 14,
  },
  guidancePills: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    padding: '3px 10px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
  },
  editorWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    flex: 1,
  },
  textarea: {
    flex: 1,
    width: '100%',
    minHeight: 220,
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.35)',
    border: '1.5px solid',
    borderBottom: 'none',
    borderRadius: '12px 12px 0 0',
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 1.75,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  footer: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    padding: '8px 14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    fontWeight: 600,
  },
  progressBg: {
    height: 3,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  warning: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: 600,
  },
  successHint: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 600,
  },
  tipsCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: '12px 16px',
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 8,
  },
  tipsList: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.6,
  },
};
