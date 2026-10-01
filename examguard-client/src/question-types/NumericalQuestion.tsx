import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Question } from '../lib/types';

interface NumericalQuestionProps {
  question: Question;
  value: string;
  onChange: (val: string) => void;
}

export default function NumericalQuestion({ question, value, onChange }: NumericalQuestionProps) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mathRef.current) {
      try {
        // Look for $...$ or render entire text if math
        const formulaMatch = question.text.match(/\$(.*?)\$/);
        if (formulaMatch) {
          katex.render(formulaMatch[1], mathRef.current, { throwOnError: false, displayMode: true });
        } else {
          mathRef.current.innerHTML = '';
        }
      } catch (e) {
        console.error('KaTeX rendering error:', e);
      }
    }
  }, [question.text]);

  return (
    <div style={styles.container}>
      <h3 style={styles.questionText}>{question.text.replace(/\$(.*?)\$/, '')}</h3>

      {/* Rendered formula */}
      <div ref={mathRef} style={styles.formulaBox} />

      <div style={styles.inputSection}>
        <label style={styles.inputLabel}>Enter Numerical Answer:</label>
        <div style={styles.inputRow}>
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 42.5"
            style={styles.numericInput}
          />
          {question.tolerance !== undefined && question.tolerance > 0 && (
            <span style={styles.toleranceBadge}>±{question.tolerance} tolerance</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  questionText: { fontSize: 18, fontWeight: 600, color: '#f3f4f6', lineHeight: 1.6, margin: 0 },
  formulaBox: { background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  inputSection: { marginTop: 12 },
  inputLabel: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 },
  inputRow: { display: 'flex', alignItems: 'center', gap: 12 },
  numericInput: { width: 240, padding: '14px 18px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(99,102,241,0.5)', borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: 700, outline: 'none' },
  toleranceBadge: { fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 6 },
};
