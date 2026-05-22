import React from 'react';

import { fileTypeLabel, hasExtendedJobDetails } from './publicApplyUi.js';

export function ScreeningQuestionsSection({
  questions = [],
  answers = {},
  errors = {},
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

          return (
            <div className="form-group screening-card" key={questionId}>
              <label className={question?.required ? 'required' : ''} htmlFor={`screening-${questionId}`}>
                {prompt || 'Screening question'}
              </label>
              {type === 'textarea' ? (
                <textarea
                  id={`screening-${questionId}`}
                  rows={4}
                  placeholder={question?.placeholder || 'Enter your answer'}
                  value={answer}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => onAnswerChange(questionId, event.target.value)}
                />
              ) : type === 'select' || type === 'dropdown' ? (
                <select
                  id={`screening-${questionId}`}
                  value={answer}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => onAnswerChange(questionId, event.target.value)}
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : type === 'radio' || type === 'yes_no' ? (
                <div className="screening-radioGroup">
                  {options.map((option) => (
                    <label key={option} className="screening-radioOption">
                      <input
                        type="radio"
                        name={`screening-${questionId}`}
                        value={option}
                        checked={answer === option}
                        onChange={(event) => onAnswerChange(questionId, event.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  id={`screening-${questionId}`}
                  type={type === 'number' ? 'number' : 'text'}
                  inputMode={type === 'number' ? 'decimal' : undefined}
                  placeholder={question?.placeholder || 'Enter your answer'}
                  value={answer}
                  aria-invalid={Boolean(error)}
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

export function ResumePreviewCard({
  file,
  fileSizeText = '',
  pdfPreviewUrl = '',
  onChangeFile,
  onRemoveFile,
}) {
  if (!file) return null;

  return (
    <div className="resume-preview-card">
      <div className="resume-preview-head">
        <div>
          <strong>{file.name}</strong>
          <span>{fileSizeText || 'Ready'} | {fileTypeLabel(file)}</span>
        </div>
        <div className="resume-preview-actions">
          <button type="button" className="job-card-link" onClick={onChangeFile}>
            Change file
          </button>
          {typeof onRemoveFile === 'function' ? (
            <button type="button" className="job-card-link danger" onClick={onRemoveFile}>
              Remove file
            </button>
          ) : null}
        </div>
      </div>
      {pdfPreviewUrl ? (
        <iframe className="resume-preview-frame" src={pdfPreviewUrl} title="Resume preview" />
      ) : (
        <p className="resume-preview-note">Preview is available only for PDF files. DOC and DOCX files will be uploaded securely without inline preview.</p>
      )}
    </div>
  );
}

export function JobDetailsModal({
  job,
  onClose,
  onApplyNow,
}) {
  if (!job) return null;

  return (
    <div className="job-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="job-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="job-modal-head">
          <div>
            <p className="job-modal-kicker">Job Details</p>
            <h3 id="job-modal-title">{job.label}</h3>
            {job.openingCount > 0 ? (
              <span className="job-card-active">{job.openingCount} opening{job.openingCount > 1 ? 's' : ''}</span>
            ) : null}
          </div>
          <button type="button" className="job-modal-close" onClick={onClose} aria-label="Close job details">
            &times;
          </button>
        </div>

        {hasExtendedJobDetails(job) ? (
          <div className="job-modal-body">
            {job.jobDescription ? (
              <div className="job-modal-section">
                <h4>Role summary</h4>
                <p>{job.jobDescription}</p>
              </div>
            ) : null}
            {job.skills ? (
              <div className="job-modal-section">
                <h4>Skills</h4>
                <p>{job.skills}</p>
              </div>
            ) : null}
            {job.location || job.experience ? (
              <div className="job-modal-meta">
                {job.location ? <span><strong>Location:</strong> {job.location}</span> : null}
                {job.experience ? <span><strong>Experience:</strong> {job.experience}</span> : null}
              </div>
            ) : null}
            {Array.isArray(job.screeningQuestions) && job.screeningQuestions.length > 0 ? (
              <div className="job-modal-section">
                <h4>Pre-screening</h4>
                <ul className="job-modal-list">
                  {job.screeningQuestions.map((question) => (
                    <li key={question.id}>{question.question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="job-modal-fallback">
            Detailed role information is not available for this position yet. You can still continue with the application form.
          </div>
        )}

        <div className="job-modal-actions">
          <button type="button" className="btn-link-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-link-primary" onClick={onApplyNow}>
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
}
