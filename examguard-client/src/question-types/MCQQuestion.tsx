import { Question } from '../lib/types';

interface MCQQuestionProps {
  question: Question;
  selectedAnswer: string;
  onSelect: (option: string) => void;
}

export default function MCQQuestion({ question, selectedAnswer, onSelect }: MCQQuestionProps) {
  const options = question.options ?? [];

  return (
    <div style={styles.container}>
      <h3 style={styles.questionText}>{question.text}</h3>

      <div style={styles.optionsList}>
        {options.map((option: string, idx: number) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const isSelected = selectedAnswer === letter;

          return (
            <div
              key={letter}
              onClick={() => onSelect(letter)}
              style={{
                ...styles.optionCard,
                borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div
                style={{
                  ...styles.letterCircle,
                  background: isSelected ? '#6366f1' : 'rgba(255,255,255,0.06)',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
              >
                {letter}
              </div>
              <div style={styles.optionContent}>{option}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 20 },
  questionText: { fontSize: 18, fontWeight: 600, color: '#f3f4f6', lineHeight: 1.6, margin: 0 },
  optionsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  optionCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 12, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s ease' },
  letterCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 },
  optionContent: { fontSize: 15, color: '#e5e7eb', flex: 1 },
};
