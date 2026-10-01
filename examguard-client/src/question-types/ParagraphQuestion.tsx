import { Question, SubQuestion } from '../lib/types';

interface ParagraphQuestionProps {
  question: Question;
  responses: Record<string, string>;
  onChange: (subId: string, value: string) => void;
}

export default function ParagraphQuestion({ question, responses, onChange }: ParagraphQuestionProps) {
  const passage = question.passage || question.text;
  const subQuestions: SubQuestion[] = question.sub_questions || [];

  return (
    <div style={styles.container}>
      {/* Passage scroll pane */}
      <div style={styles.passagePane}>
        <div style={styles.sectionBadge}>Reading Passage</div>
        <div style={styles.passageText}>{passage}</div>
      </div>

      {/* Sub questions pane */}
      <div style={styles.questionsPane}>
        <div style={styles.sectionBadge}>Comprehension Questions</div>

        <div style={styles.subList}>
          {subQuestions.length > 0 ? (
            subQuestions.map((sub: SubQuestion, idx: number) => (
              <div key={idx} style={styles.subCard}>
                <div style={styles.subNum}>Question {idx + 1} ({sub.marks} marks)</div>
                <div style={styles.subText}>{sub.text}</div>

                {sub.sub_type === 'mcq' && sub.options ? (
                  <div style={styles.mcqOptions}>
                    {sub.options.map((opt: string, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = responses[idx.toString()] === letter;
                      return (
                        <div
                          key={letter}
                          onClick={() => onChange(idx.toString(), letter)}
                          style={{
                            ...styles.mcqOption,
                            borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)',
                            background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <span style={styles.letter}>{letter}</span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={responses[idx.toString()] || ''}
                    onChange={(e) => onChange(idx.toString(), e.target.value)}
                    placeholder="Type your concise response here..."
                    style={styles.textArea}
                  />
                )}
              </div>
            ))
          ) : (
            <div style={styles.subCard}>
              <div style={styles.subText}>{question.text}</div>
              <textarea
                rows={5}
                value={responses['0'] || ''}
                onChange={(e) => onChange('0', e.target.value)}
                placeholder="Write your detailed explanation..."
                style={styles.textArea}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: 20, height: '100%' },
  passagePane: { background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' },
  sectionBadge: { fontSize: 11, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' },
  passageText: { fontSize: 14, lineHeight: 1.8, color: '#d1d5db', whiteSpace: 'pre-wrap' },
  questionsPane: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  subList: { display: 'flex', flexDirection: 'column', gap: 16 },
  subCard: { background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 },
  subNum: { fontSize: 12, fontWeight: 700, color: '#818cf8' },
  subText: { fontSize: 14, fontWeight: 500, color: '#f3f4f6' },
  textArea: { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none' },
  mcqOptions: { display: 'flex', flexDirection: 'column', gap: 8 },
  mcqOption: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, color: '#e5e7eb' },
  letter: { fontWeight: 700, color: '#a5b4fc', minWidth: 16 },
};
