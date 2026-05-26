import React from 'react';

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export function ScreeningQuestionsSection({
  questions = EMPTY_ARRAY,
  answers = EMPTY_OBJECT,
  errors = EMPTY_OBJECT,
  onAnswerChange,
}) {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  return (
    <section className="screening-section" aria-labelledby="screening-section-title">
      <div className="form-section-title" id="screening-section-title">Role screening</div>
      <p className="screening-section-note">
        Answer only the questions shown for your selected role. Required responses must be completed before final submission.
      </p>
      <div className="screening-grid">
        {questions.map((question) => {
          const questionId = String(question?.id || '').trim();
          const answer = answers[questionId] || '';
          const error = errors[questionId] || '';
          const type = String(question?.type || 'text').toLowerCase();
          const prompt = String(question?.question || question?.label || '').trim();
          const legacyOptions = Array.isArray(question?.options) ? question.options : [];
          const options =
            type === 'yes_no' && legacyOptions.length === 0
              ? ['Yes', 'No']
              : legacyOptions;

          const controlId = `screening-${questionId}`;

          return (
            <div className="form-group screening-card" key={questionId}>
              <label className={question?.required ? 'required' : ''} htmlFor={controlId}>
                {prompt || 'Screening question'}
              </label>
              {type === 'textarea' ? (
                <textarea
                  id={controlId}
                  rows={4}
                  placeholder={question?.placeholder || 'Enter your answer'}
                  value={answer}
                  aria-invalid={Boolean(error)}
                  aria-label={prompt || 'Screening question'}
                  onChange={(event) => onAnswerChange(questionId, event.target.value)}
                />
              ) : type === 'select' || type === 'dropdown' ? (
                <select
                  id={controlId}
                  value={answer}
                  aria-invalid={Boolean(error)}
                  aria-label={prompt || 'Screening question'}
                  onChange={(event) => onAnswerChange(questionId, event.target.value)}
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : type === 'radio' || type === 'yes_no' ? (
                <div className="screening-radioGroup" role="radiogroup" aria-label={prompt || 'Screening question'}>
                  {options.map((option) => (
                    <label key={option} className="screening-radioOption">
                      <input
                        type="radio"
                        name={controlId}
                        value={option}
                        checked={answer === option}
                        aria-label={option}
                        onChange={(event) => onAnswerChange(questionId, event.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  id={controlId}
                  type={type === 'number' ? 'number' : 'text'}
                  inputMode={type === 'number' ? 'decimal' : undefined}
                  placeholder={question?.placeholder || 'Enter your answer'}
                  value={answer}
                  aria-invalid={Boolean(error)}
                  aria-label={prompt || 'Screening question'}
                  onChange={(event) => onAnswerChange(questionId, event.target.value)}
                />
              )}
              {error ? <div className="field-error-note">{error}</div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
