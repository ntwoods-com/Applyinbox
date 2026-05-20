export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return '< 1 KB';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function getFileExtension(file) {
  return (String(file?.name || '').split('.').pop() || '').toLowerCase();
}

export function isPreviewablePdfFile(file) {
  if (!file) return false;
  const ext = getFileExtension(file);
  const mime = String(file.type || '').toLowerCase();
  return ext === 'pdf' || mime === 'application/pdf';
}

export function fileTypeLabel(file) {
  const ext = getFileExtension(file).toUpperCase();
  return ext || String(file?.type || '').toUpperCase() || 'Unknown';
}

export function hasExtendedJobDetails(job) {
  return Boolean(
    String(job?.jobDescription || '').trim() ||
      String(job?.skills || '').trim() ||
      String(job?.location || '').trim() ||
      String(job?.experience || '').trim() ||
      (Array.isArray(job?.screeningQuestions) && job.screeningQuestions.length)
  );
}

export function retryHintText(retryAfterSeconds) {
  const seconds = Number(retryAfterSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `Please try again in about ${Math.max(1, Math.ceil(seconds))} seconds.`;
  if (seconds < 3600) return `Please try again in about ${Math.max(1, Math.ceil(seconds / 60))} minutes.`;
  return `Please try again in about ${Math.max(1, Math.ceil(seconds / 3600))} hours.`;
}

export function mapPublicApplyError({ status = 0, payload = {}, fallback = '' } = {}) {
  const code = String(payload?.error_code || '').trim().toUpperCase();
  const retryHint = retryHintText(payload?.retry_after_seconds);

  if (status === 429 || code === 'RATE_LIMITED') {
    return retryHint ? `Too many attempts right now. ${retryHint}` : 'Too many attempts right now. Please try again later.';
  }
  if (code === 'TURNSTILE_FAILED') {
    return 'Please complete the verification check and try again.';
  }
  if (code === 'INVALID_FILE') {
    return payload?.error || 'Please upload a valid PDF, DOC, or DOCX file up to 2MB.';
  }
  if (code === 'JOB_UNAVAILABLE') {
    return 'The selected job is no longer available. Please refresh and choose an active role.';
  }
  if (code === 'VALIDATION_ERROR') {
    return payload?.error || 'Please review the highlighted fields and try again.';
  }
  if (code === 'NETWORK_OR_SERVER_ERROR') {
    return 'We could not complete the request right now. Please try again shortly.';
  }
  return payload?.error || fallback || 'Something went wrong. Please try again.';
}

export function validateScreeningAnswers(questions = [], answers = {}) {
  const errors = {};
  for (const question of Array.isArray(questions) ? questions : []) {
    const id = String(question?.id || '').trim();
    if (!id) continue;
    const value = String(answers?.[id] || '').trim();
    if (question?.required && !value) {
      errors[id] = 'This question is required.';
    }
  }
  return errors;
}
