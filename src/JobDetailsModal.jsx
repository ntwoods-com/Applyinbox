import React from 'react';
import { hasExtendedJobDetails } from './publicApplyUi.js';

export function JobDetailsModal({
  job,
  onClose,
  onApplyNow,
}) {
  if (!job) return null;

  return (
    <div className="job-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="job-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-drawer-title"
      >
        <div className="job-drawer-content" onClick={(event) => event.stopPropagation()} role="presentation">
          <div className="job-drawer-head">
            <div>
              <p className="job-drawer-kicker">Job Details</p>
              <h3 id="job-drawer-title">{job.label}</h3>
              {job.openingCount > 0 ? (
                <span className="job-card-active">{job.openingCount} opening{job.openingCount > 1 ? 's' : ''}</span>
              ) : null}
            </div>
            <button type="button" className="job-drawer-close" onClick={onClose} aria-label="Close job details drawer">
              &times;
            </button>
          </div>

          {hasExtendedJobDetails(job) ? (
            <div className="job-drawer-body">
              {job.jobDescription ? (
                <div className="job-drawer-section">
                  <h4>Role summary</h4>
                  <p>{job.jobDescription}</p>
                </div>
              ) : null}
              {job.skills ? (
                <div className="job-drawer-section">
                  <h4>Skills</h4>
                  <p>{job.skills}</p>
                </div>
              ) : null}
              {job.location || job.experience ? (
                <div className="job-drawer-meta">
                  {job.location ? <span><strong>Location:</strong> {job.location}</span> : null}
                  {job.experience ? <span><strong>Experience:</strong> {job.experience}</span> : null}
                </div>
              ) : null}
              {Array.isArray(job.screeningQuestions) && job.screeningQuestions.length > 0 ? (
                <div className="job-drawer-section">
                  <h4>Pre-screening</h4>
                  <ul className="job-drawer-list">
                    {job.screeningQuestions.map((question) => (
                      <li key={question.id}>{question.question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="job-drawer-fallback">
              Detailed role information is not available for this position yet. You can still continue with the application form.
            </div>
          )}

          <div className="job-drawer-actions">
            <button type="button" className="btn-link-secondary" onClick={onClose} aria-label="Close drawer">
              Close
            </button>
            <button type="button" className="btn-link-primary" onClick={onApplyNow} aria-label={`Apply now for ${job.label}`}>
              Apply Now
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
