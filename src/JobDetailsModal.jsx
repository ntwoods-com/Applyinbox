import React from 'react';
import { hasExtendedJobDetails } from './publicApplyUi.js';

export function JobDetailsModal({
  job,
  onClose,
  onApplyNow,
}) {
  if (!job) return null;

  return (
    <div className="job-modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="job-modal"
        open
        aria-modal="true"
        aria-labelledby="job-modal-title"
      >
        <div className="job-modal-content" onClick={(event) => event.stopPropagation()} role="presentation">
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
      </dialog>
    </div>
  );
}
