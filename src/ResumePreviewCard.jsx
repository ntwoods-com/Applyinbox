import React from 'react';
import { fileTypeLabel } from './publicApplyUi.js';

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
        <iframe
          className="resume-preview-frame"
          src={pdfPreviewUrl}
          title="Resume preview"
          sandbox="allow-same-origin"
        />
      ) : (
        <p className="resume-preview-note">Preview is available only for PDF files. DOC and DOCX files will be uploaded securely without inline preview.</p>
      )}
    </div>
  );
}
