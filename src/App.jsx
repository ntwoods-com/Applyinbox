import React, { useEffect, useMemo, useRef, useState, useReducer, useCallback } from 'react';
import { API_BASE, TURNSTILE_SITE_KEY } from './config.js';
import {
  fileTypeLabel,
  formatFileSize,
  isPreviewablePdfFile,
  mapPublicApplyError,
  validateScreeningAnswers,
} from './publicApplyUi.js';
import { ScreeningQuestionsSection } from './publicApplyComponents.jsx';
import { JobDetailsModal } from './JobDetailsModal.jsx';
import { ResumePreviewCard } from './ResumePreviewCard.jsx';

const DRAFT_KEY = 'ntw_careers_apply_draft_v1';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_MIME_TYPES = new Set([
  '',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const roleCards = [
  ['Accounts & Admin', 'Accounting, office coordination and operations support.'],
  ['HR & Recruitment', 'Hiring, candidate coordination and employee lifecycle.'],
  ['Sales & Marketing', 'Customer coordination, field sales and business growth.'],
  ['IT Support', 'Systems, support and internal digital operations.'],
];

const benefits = [
  ['1', 'Clean application flow', 'Basic details, role preference and CV upload are captured in one structured form.'],
  ['2', 'Protected verification', 'Bot checks, timing checks and Turnstile verification help reduce fake submissions.'],
  ['3', 'HR-ready review', 'Submitted applications can be reviewed inside the HRMS workflow for further action.'],
];

const processSteps = [
  ['01', 'Apply online', 'Submit your contact details, role preference and latest CV.'],
  ['02', 'HR review', 'The HR team reviews your application against current requirements.'],
  ['03', 'Next round', 'If shortlisted, you will be contacted for interview or further evaluation.'],
];

const faqItems = [
  ['Which file formats are accepted?', 'PDF, DOC and DOCX files are accepted up to 2MB. PDF is recommended for best compatibility.'],
  ['Can I apply for other positions?', 'Yes. Select "Other" if your exact role is not available, and the HR team can review your profile accordingly.'],
  ['Will I receive a response?', 'Shortlisted candidates are contacted by HR. Response time depends on active requirements and role priority.'],
  ['Why is verification required?', 'Verification helps protect the form from automated or fake submissions.'],
];

const fallbackPositions = [
  ['', 'Select a position'],
  ['ACC-001', 'Accountant'],
  ['HR-001', 'HR Executive'],
  ['SALES-001', 'Sales Executive'],
  ['MKTG-001', 'Marketing Executive'],
  ['ADMIN-001', 'Admin Executive'],
  ['IT-001', 'IT Support'],
  ['OTHER', 'Other'],
];

const experienceOptions = [
  ['', 'Select experience'],
  ['0', 'Fresher (0 Years)'],
  ['1', '1 Year'],
  ['2', '2 Years'],
  ['3', '3 Years'],
  ['4', '4 Years'],
  ['5', '5+ Years'],
];

const STEP_ORDER = ['contact', 'role', 'resume', 'verify'];

function getPageViewFromHash(hash = window.location.hash) {
  const normalized = String(hash || '').trim().toLowerCase();
  if (normalized === '#apply-form' || normalized === '#application') {
    return 'apply';
  }
  return 'browse';
}

const fallbackPositionOptions = fallbackPositions.map(([value, label]) => ({
  value,
  label,
  requirementId: '',
  dynamic: false,
}));
const VALID_EXPERIENCE = new Set(
  experienceOptions.flatMap(([value]) => (value ? [value] : []))
);

function Icon({ name, className = '', title }) {
  const sharedProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': title ? undefined : 'true',
    role: title ? 'img' : undefined,
  };

  switch (name) {
    case 'arrowRight':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    case 'check':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case 'checkCircle':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="9" />
          <path d="M8.8 12.3 11 14.5 15.5 10" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
          <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
          <path d="M4.5 7h15A1.5 1.5 0 0 1 21 8.5v8A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-8A1.5 1.5 0 0 1 4.5 7Z" />
          <path d="M3 11.5h18" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M12 3.5 5.5 6v5.5c0 4 2.5 7.2 6.5 9 4-1.8 6.5-5 6.5-9V6L12 3.5Z" />
          <path d="m9.5 12 1.6 1.7 3.4-3.7" />
        </svg>
      );
    case 'user':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
          <path d="m4.5 7 7.5 5 7.5-5" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M8.5 4.5h7a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M11 16.5h2" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M12 20s5-5.2 5-9a5 5 0 1 0-10 0c0 3.8 5 9 5 9Z" />
          <circle cx="12" cy="11" r="1.8" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'file':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="M8 3.8h6l4 4V20H8a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
          <path d="M14 3.8v4h4" />
          <path d="M9 14h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <rect x="5.5" y="11" width="13" height="9" rx="2" />
          <path d="M8.5 11V8.5a3.5 3.5 0 1 1 7 0V11" />
        </svg>
      );
    case 'search':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'send':
      return (
        <svg {...sharedProps}>
          {title ? <title>{title}</title> : null}
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    default:
      return null;
  }
}

function generateToken() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `tkn_${window.crypto.randomUUID()}`;
  }

  return `tkn_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeSourceValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 50);
  return normalized;
}

function formatSourceLabel(value) {
  const normalized = normalizeSourceValue(value);
  if (!normalized || normalized === 'website' || normalized === 'public_apply') {
    return 'Website / Direct';
  }
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSourceText() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('source') || params.get('utm_source') || params.get('ref') || '';
  if (!String(raw || '').trim()) return '';
  return normalizeSourceValue(raw) || 'website';
}

function isValidWhatsappNumber(value) {
  return /^[1-9][0-9]{9,14}$/.test(String(value || '').trim());
}

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

function sanitizeField(field, rawValue) {
  if (field === 'mobile') {
    return String(rawValue || '').replace(/\D/g, '').slice(0, 10);
  }

  if (field === 'email') {
    return String(rawValue || '').replace(/\s+/g, '').slice(0, 100);
  }

  if (field === 'name') {
    return normalizeSpaces(rawValue).slice(0, 100);
  }

  if (field === 'location') {
    return normalizeSpaces(rawValue)
      .replace(/[^A-Za-z0-9\u00C0-\u024F.,'()\/ -]/g, '')
      .slice(0, 100);
  }

  return String(rawValue || '');
}

function validateValue(field, rawValue) {
  const value = String(rawValue || '').trim();

  if (field === 'name') {
    return value.length >= 2 && /^[A-Za-z\u00C0-\u024F.' -]{2,100}$/.test(value);
  }

  if (field === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  if (field === 'mobile') {
    return !value || /^[6-9][0-9]{9}$/.test(value);
  }

  if (field === 'location') {
    return !value || /^[A-Za-z0-9\u00C0-\u024F.,'()\/ -]{2,100}$/.test(value);
  }

  if (field === 'position') {
    return Boolean(value);
  }

  if (field === 'experience') {
    return !value || VALID_EXPERIENCE.has(value);
  }

  return true;
}

function getFieldError(field, validity) {
  if (validity !== false) return '';

  if (field === 'name') {
    return 'Enter at least 2 letters. Numbers and unsupported symbols are not allowed.';
  }

  if (field === 'email') {
    return 'Enter a valid email address.';
  }

  if (field === 'mobile') {
    return 'Enter a valid 10-digit mobile number starting with 6-9, or leave this blank.';
  }

  if (field === 'location') {
    return 'Use letters, numbers, comma, apostrophe, slash, parentheses, period or dash only.';
  }

  if (field === 'position') {
    return 'Select the position you want to apply for.';
  }

  return '';
}

function fieldIcon(validity, value) {
  if (validity === undefined || !String(value || '').trim()) return '';
  return validity ? 'check' : 'alert';
}

function fieldClass(validity, value) {
  if (validity === undefined && !String(value || '').trim()) return '';
  if (validity === true) return 'valid';
  if (validity === false) return 'invalid';
  return '';
}

async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

let globalTurnstileWidgetId = null;

function FileDropzone({
  selectedFile,
  dragging,
  setDragging,
  handleFile,
  fileInputRef,
  resetFileInput,
  fileError,
  fileSizeText,
  pdfPreviewUrl,
}) {
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="field-group">
      <div
        className={`file-dropzone ${dragging ? 'drag-active' : ''}`}
        onDragEnter={(event) => {
          preventDefaults(event);
          setDragging(true);
        }}
        onDragOver={(event) => {
          preventDefaults(event);
          setDragging(true);
        }}
        onDragLeave={(event) => {
          preventDefaults(event);
          setDragging(false);
        }}
        onDrop={(event) => {
          preventDefaults(event);
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            handleFile(file);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="cv"
          accept=".pdf,.doc,.docx"
          required
          aria-label="Resume"
          aria-describedby="file-help"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <label
          className={`file-label ${selectedFile ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
          htmlFor="cv"
        >
          <div className="file-icon" aria-hidden="true">
            <Icon className="icon-lg" name="file" />
          </div>
          <div className="file-text">
            <div className="main" id="file-name">{selectedFile ? selectedFile.name : 'Choose your CV or drag and drop it here'}</div>
            <div className="sub" id="file-help">
              {selectedFile ? (
                <>
                  <span className="file-size">{fileSizeText}</span>
                  <span className="file-meta-separator">{fileTypeLabel(selectedFile)}</span>
                </>
              ) : (
                'PDF, DOC, DOCX accepted | maximum 2MB'
              )}
            </div>
          </div>
        </label>
        <button
          type="button"
          className={`remove-file ${selectedFile ? '' : 'hidden'}`}
          onClick={(event) => {
            event.stopPropagation();
            resetFileInput();
          }}
        >
          Remove
        </button>
      </div>
      {fileError ? <div className="field-error-note">{fileError}</div> : null}
      <ResumePreviewCard
        file={selectedFile}
        fileSizeText={fileSizeText}
        pdfPreviewUrl={pdfPreviewUrl}
        onChangeFile={() => fileInputRef.current?.click()}
        onRemoveFile={resetFileInput}
      />
    </div>
  );
}

function StatusCheckSection() {
  const [statusState, setStatusState] = useState({
    form: { applyId: '', email: '' },
    loading: false,
    error: '',
    result: null,
  });

  const { form: statusForm, loading: statusLoading, error: statusError, result: statusResult } = statusState;

  function updateStatusField(field, value) {
    setStatusState((prev) => ({
      ...prev,
      form: { ...prev.form, [field]: field === 'email' ? String(value || '').trim() : String(value || '').trim() },
      error: '',
      result: null,
    }));
  }

  async function handleStatusCheck(event) {
    event.preventDefault();
    if (statusState.loading) return;

    const applyId = String(statusState.form.applyId || '').trim();
    const email = String(statusState.form.email || '').trim().toLowerCase();

    if (!applyId || !validateValue('email', email)) {
      setStatusState((prev) => ({ ...prev, error: 'Please enter the Application ID and the same email used for the application.' }));
      return;
    }

    try {
      setStatusState((prev) => ({ ...prev, loading: true, error: '', result: null }));
      const response = await fetchWithTimeout(`${API_BASE}/v1/apply/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          apply_id: applyId,
          email: email,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 429) {
        throw new Error(mapPublicApplyError({ status: response.status, payload }));
      }
      if (!response.ok || !payload?.success) {
        setStatusState((prev) => ({ ...prev, error: 'We could not verify those application details. Please check the Application ID and email.' }));
        return;
      }

      setStatusState((prev) => ({
        ...prev,
        result: {
          applyId: payload.apply_id,
          statusLabel: payload.status_label,
          positionTitle: payload.position_title,
          appliedAt: payload.applied_at,
          source: payload.source,
        },
      }));
    } catch (error) {
      setStatusState((prev) => ({ ...prev, error: error?.message || 'Unable to check application status right now.' }));
    } finally {
      setStatusState((prev) => ({ ...prev, loading: false }));
    }
  }

  return (
    <section className="section" id="status-check" aria-labelledby="status-check-title">
      <div className="page-shell">
        <div className="section-header">
          <h2 id="status-check-title">Check Application Status</h2>
          <p>Use your Application ID and the same email you submitted with. This shows only the public application status.</p>
        </div>
        <div className="status-check-card">
          <form className="status-check-form" onSubmit={handleStatusCheck}>
            <div className="status-check-grid">
              <label className="form-group">
                <span className="required">Application ID</span>
                <input
                  type="text"
                  value={statusForm.applyId}
                  placeholder="PA-2026-XXXXXXX"
                  aria-label="Application ID"
                  onChange={(event) => updateStatusField('applyId', event.target.value)}
                />
              </label>
              <label className="form-group">
                <span className="required">Email Address</span>
                <input
                  type="email"
                  value={statusForm.email}
                  placeholder="your.email@example.com"
                  aria-label="Email Address"
                  onChange={(event) => updateStatusField('email', event.target.value)}
                />
              </label>
            </div>
            <div className="status-check-actions">
              <button type="submit" className="btn btn-primary" disabled={statusLoading}>
                {!statusLoading ? <Icon className="btn-icon" name="search" /> : <span className="spinner" aria-hidden="true" />}
                <span>{statusLoading ? 'Checking Status...' : 'Check Status'}</span>
              </button>
            </div>
          </form>
          {statusError ? <div className="status-check-error" role="alert">{statusError}</div> : null}
          {statusResult ? (
            <div className="status-result" aria-live="polite">
              <div className="status-result-label">{statusResult.statusLabel}</div>
              <div className="status-result-meta">
                <div className="status-meta-item">
                  <span>Application ID</span>
                  <strong>{statusResult.applyId}</strong>
                </div>
                <div className="status-meta-item">
                  <span>Position</span>
                  <strong>{statusResult.positionTitle || '-'}</strong>
                </div>
                <div className="status-meta-item">
                  <span>Applied At</span>
                  <strong>{statusResult.appliedAt || '-'}</strong>
                </div>
                {statusResult.source ? (
                  <div className="status-meta-item">
                    <span>Source</span>
                    <strong>{statusResult.source}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function WhyApplySection() {
  return (
    <section className="section" aria-labelledby="why-title">
      <div className="page-shell">
        <div className="section-header">
          <h2 id="why-title">Why apply through this portal?</h2>
          <p>We keep the application flow simple, organized and protected so that candidate details can move quickly to the right HR review stage.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map(([num, title, description]) => (
            <article className="benefit-card" key={title}>
              <div className="benefit-icon" aria-hidden="true">{num}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className="section" id="process" aria-labelledby="process-title">
      <div className="page-shell">
        <div className="section-header">
          <h2 id="process-title">Hiring process</h2>
          <p>The actual steps may vary by role, but this gives candidates a simple view of the expected journey.</p>
        </div>
        <div className="process-grid">
          {processSteps.map(([step, title, description]) => (
            <article className="process-card" key={step}>
              <div className="process-step">{step}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="page-shell">
        <div className="section-header">
          <h2 id="faq-title">Quick FAQ</h2>
          <p>Keep your CV updated and ensure your email and mobile number are correct before submitting the form.</p>
        </div>
        <div className="faq-panel">
          {faqItems.map(([question, answer]) => (
            <div className="faq-item" key={question}>
              <strong>{question}</strong>
              <span>{answer}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [form, setForm] = useState(() => {
    const initialState = {
      name: '',
      email: '',
      mobile: '',
      location: '',
      position: '',
      experience: '',
      consent: false,
    };
    try {
      if (typeof window !== 'undefined') {
        const draft = window.sessionStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          return { ...initialState, ...parsed };
        }
      }
    } catch {
      // Ignore
    }
    return initialState;
  });
  const [validation, setValidation] = useState({});
  const [alert, setAlert] = useState(null);
  const [dynamicJobs, setDynamicJobs] = useState();
  const [publicConfig, setPublicConfig] = useState({ whatsapp_enabled: false, whatsapp_number: '' });
  const [turnstile, dispatchTurnstile] = useReducer((state, action) => {
    switch (action.type) {
      case 'LOADING': return { ...state, status: 'loading' };
      case 'SUCCESS': return { token: action.payload || '', status: action.payload ? 'verified' : 'ready' };
      case 'EXPIRED': return { token: '', status: 'expired' };
      case 'ERROR': return { token: '', status: 'error' };
      case 'READY': return { ...state, status: 'ready' };
      case 'RESET': return { token: '', status: 'ready' };
      default: return state;
    }
  }, { token: '', status: 'loading' });

  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    buttonText: 'Submit Application',
    successApplyId: null,
    submitted: false,
    submitAttempted: false,
    copyFeedback: '',
    submittedContext: {},
  });

  const [activeJobModal, setActiveJobModal] = useState(null);
  const [fileState, setFileState] = useState({
    selected: null,
    error: '',
    dragging: false,
    previewUrl: '',
  });
  const [screeningState, setScreeningState] = useState({ answers: {}, errors: {} });
  const [visibleStep, setVisibleStep] = useState('contact');
  const [pageView, setPageView] = useState(() => getPageViewFromHash());


  const fileInputRef = useRef(null);
  const turnstileRef = useRef(null);
  const alertRef = useRef(null);
  const hpRef = useRef(null);
  const applicationCardRef = useRef(null);
  const nameInputRef = useRef(null);
  const positionInputRef = useRef(null);
  const contactStepRef = useRef(null);
  const roleStepRef = useRef(null);
  const resumeStepRef = useRef(null);
  const verifyStepRef = useRef(null);
  const sourceTextRef = useRef(getSourceText());
  const sessionTokenRef = useRef(generateToken());
  const formLoadTimeRef = useRef(Date.now());
  const sourceText = sourceTextRef.current;
  const sourceDisplayText = formatSourceLabel(sourceText);
  const usingDynamicJobs = (dynamicJobs || []).length > 0;
  const positionOptions = usingDynamicJobs
    ? [{ value: '', label: 'Select a position', requirementId: '', dynamic: false }, ...dynamicJobs]
    : fallbackPositionOptions;
  const selectedPosition = positionOptions.find((option) => option.value === form.position) || null;
  const activeScreeningQuestions = useMemo(
    () => (Array.isArray(selectedPosition?.screeningQuestions) ? selectedPosition.screeningQuestions : []),
    [selectedPosition]
  );
  const availableRoleCount = positionOptions.filter((option) => option.value).length;
  const totalDynamicOpenings = usingDynamicJobs
    ? dynamicJobs.reduce((sum, option) => sum + Math.max(0, Number(option.openingCount || 0)), 0)
    : 0;
  const heroStats = [
    {
      value: String(usingDynamicJobs ? availableRoleCount : Math.max(availableRoleCount - 1, 1)).padStart(2, '0'),
      label: usingDynamicJobs ? 'Live approved roles' : 'Role tracks open',
      note: usingDynamicJobs ? 'Synced from active HR-approved requirements.' : 'Fallback role list remains available for direct applications.',
    },
    {
      value: totalDynamicOpenings > 0 ? String(totalDynamicOpenings).padStart(2, '0') : '2-Step',
      label: totalDynamicOpenings > 0 ? 'Openings listed' : 'Protected apply flow',
      note: totalDynamicOpenings > 0 ? 'Open counts are shown only when safely available.' : 'Details are submitted first, then the CV is securely uploaded.',
    },
    {
      value: sourceText ? sourceDisplayText : 'Direct',
      label: 'Application source',
      note: sourceText ? 'Your visit source was captured from the page URL.' : 'No campaign tag detected. This will be treated as a direct website application.',
    },
  ];
  const formHighlights = [
    ['Role feed', usingDynamicJobs ? 'Live approved job list' : 'Curated fallback roles'],
    ['Review path', 'Manual HR screening'],
    ['Source', sourceText ? sourceDisplayText : 'Website / Direct'],
  ];
  const heroProofItems = [
    ['Manual review only', 'Every application stays in an HR review queue before any shortlist decision is made.'],
    ['Protected submission', 'Your basic details and CV stay tied to one application ID through the apply flow.'],
    [usingDynamicJobs ? 'Live openings' : 'Fallback roles ready', usingDynamicJobs
      ? 'Active approved roles are synced from the HRMS when available.'
      : 'Fallback role categories remain available even if the jobs feed is temporarily unavailable.'],
  ];

  useEffect(() => {
    const verificationStepActive = pageView === 'apply' && visibleStep === 'verify';

    if (!verificationStepActive) {
      return undefined;
    }

    if (!TURNSTILE_SITE_KEY) {
      dispatchTurnstile({ type: 'ERROR' });
      return undefined;
    }

    let cancelled = false;
    let checks = 0;
    dispatchTurnstile({ type: 'LOADING' });

    const renderTurnstile = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile || globalTurnstileWidgetId) {
        return;
      }

      try {
        globalTurnstileWidgetId = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'normal',
          theme: 'light',
          callback: (token) => {
            dispatchTurnstile({ type: 'SUCCESS', payload: token });
            setAlert(null);
          },
          'expired-callback': () => {
            dispatchTurnstile({ type: 'EXPIRED' });
            showError('Verification expired. Please complete the secure check again.');
          },
          'error-callback': () => {
            dispatchTurnstile({ type: 'ERROR' });
            showError('Verification could not load correctly. Confirm this domain is allowed in Cloudflare Turnstile settings, then refresh and try again.');
          },
        });
        dispatchTurnstile({ type: 'READY' });
      } catch {
        dispatchTurnstile({ type: 'ERROR' });
      }
    };

    renderTurnstile();

    const turnstileWatch = window.setInterval(() => {
      checks += 1;
      renderTurnstile();

      if (globalTurnstileWidgetId) {
        window.clearInterval(turnstileWatch);
      } else if (checks >= 30) {
        dispatchTurnstile({ type: 'ERROR' });
        window.clearInterval(turnstileWatch);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(turnstileWatch);

      if (window.turnstile && globalTurnstileWidgetId) {
        try {
          window.turnstile.remove(globalTurnstileWidgetId);
        } catch {
          // Widget may already be removed by the browser.
        }
      }

      globalTurnstileWidgetId = null;
    };
  }, [pageView, visibleStep]);


  useEffect(() => {
    const handleHashChange = () => {
      const nextHash = window.location.hash || '#top';
      const nextPageView = getPageViewFromHash(nextHash);
      setPageView(nextPageView);

      if (nextPageView === 'browse') {
        const targetId = String(nextHash || '').replace(/^#/, '').trim();
        if (targetId && targetId !== 'top') {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Initial mount scroll
    const initialHash = window.location.hash || '#top';
    const initialPageView = getPageViewFromHash(initialHash);
    if (initialPageView === 'browse') {
      const targetId = String(initialHash || '').replace(/^#/, '').trim();
      if (targetId && targetId !== 'top') {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicApplyData() {
      try {
        const jobsRes = await fetchWithTimeout(`${API_BASE}/v1/apply/jobs`, { method: 'GET' }, 15000);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const items = Array.isArray(jobsData?.items) ? jobsData.items : [];
          const nextJobs = items.reduce((acc, item) => {
            const value = String(item?.job_public_code || '').trim();
            const label = String(item?.position_title || '').trim();
            if (value && label) {
              acc.push({
                value,
                label,
                requirementId: String(item?.requirement_id || '').trim(),
                openingCount: Number(item?.opening_count || 0),
                location: String(item?.location || '').trim(),
                experience: String(item?.experience || '').trim(),
                jobDescription: String(item?.job_description || '').trim(),
                skills: String(item?.skills || '').trim(),
                screeningQuestions: Array.isArray(item?.screening_questions) ? item.screening_questions : [],
                dynamic: true,
              });
            }
            return acc;
          }, []);
          if (!cancelled && nextJobs.length > 0) {
            setDynamicJobs(nextJobs);
            setForm((current) => {
              if (current.position && !nextJobs.some((opt) => opt.value === current.position)) {
                return { ...current, position: '' };
              }
              return current;
            });
            setValidation((current) => {
              if (current.position !== undefined) {
                 return { ...current, position: undefined };
              }
              return current;
            });
          }
        }
      } catch {
        // Keep TODO fallback jobs active until all public roles are backend-driven.
      }

      try {
        const configRes = await fetchWithTimeout(`${API_BASE}/v1/apply/config`, { method: 'GET' }, 15000);
        if (configRes.ok) {
          const configData = await configRes.json();
          const whatsappNumber = String(configData?.whatsapp_number || '').trim();
          const whatsappEnabled = Boolean(configData?.whatsapp_enabled) && isValidWhatsappNumber(whatsappNumber);
          if (!cancelled) {
            setPublicConfig({
              whatsapp_enabled: whatsappEnabled,
              whatsapp_number: whatsappEnabled ? whatsappNumber : '',
            });
          }
        }
      } catch {
        if (!cancelled) {
          setPublicConfig({ whatsapp_enabled: false, whatsapp_number: '' });
        }
      }
    }

    loadPublicApplyData();
    return () => {
      cancelled = true;
    };
  }, []);



  useEffect(() => {
    if (!submitState.copyFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setSubmitState((prev) => ({ ...prev, copyFeedback: '' })), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [submitState.copyFeedback]);

  useEffect(() => {
    if (!fileState.selected || !isPreviewablePdfFile(fileState.selected)) {
      setFileState((prev) => ({ ...prev, previewUrl: '' }));
      return undefined;
    }
    const objectUrl = URL.createObjectURL(fileState.selected);
    setFileState((prev) => ({ ...prev, previewUrl: objectUrl }));
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [fileState.selected]);



  function stepRefFor(stepKey) {
    if (stepKey === 'contact') return contactStepRef.current;
    if (stepKey === 'role') return roleStepRef.current;
    if (stepKey === 'resume') return resumeStepRef.current;
    if (stepKey === 'verify') return verifyStepRef.current;
    return applicationCardRef.current;
  }

  function focusStep(stepKey) {
    const normalizedStep = STEP_ORDER.includes(stepKey) ? stepKey : 'contact';
    setVisibleStep(normalizedStep);
    if (normalizedStep !== 'verify') {
      dispatchTurnstile({ type: 'LOADING' });
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = stepRefFor(normalizedStep);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (normalizedStep === 'contact') {
          nameInputRef.current?.focus();
        } else if (normalizedStep === 'role') {
          positionInputRef.current?.focus();
        } else if (normalizedStep === 'verify') {
          turnstileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  function showError(message, stepKey = '') {
    setAlert({ type: 'error', message });

    window.requestAnimationFrame(() => {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (stepKey) {
        window.setTimeout(() => focusStep(stepKey), 120);
      }
    });
  }

  function openApplyPage(nextPosition = '', preferredStep = 'contact') {
    const nextStep = nextPosition ? 'role' : (STEP_ORDER.includes(preferredStep) ? preferredStep : 'contact');
    if (nextPosition) {
      updateField('position', nextPosition);
      setValidation((current) => ({ ...current, position: true }));
    }
    setPageView('apply');
    setVisibleStep(nextStep);
    if (nextStep !== 'verify') {
      dispatchTurnstile({ type: 'LOADING' });
    }
    window.history.replaceState(null, '', '#apply-form');

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applicationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (nextStep === 'contact') {
          nameInputRef.current?.focus();
        } else if (nextStep === 'role') {
          positionInputRef.current?.focus();
        } else if (nextStep === 'verify') {
          turnstileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  function openBrowsePage(anchor = 'top') {
    const nextAnchor = String(anchor || 'top').replace(/^#/, '') || 'top';
    const nextHash = `#${nextAnchor}`;
    setPageView('browse');
    dispatchTurnstile({ type: 'LOADING' });
    window.history.replaceState(null, '', nextHash);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (nextAnchor !== 'top') {
          document.getElementById(nextAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }

  function handleBrowseNavigation(event, anchor) {
    event.preventDefault();
    openBrowsePage(anchor);
  }

  function handleApplyNavigation(event, nextPosition = '', nextStep = 'contact') {
    event.preventDefault();
    openApplyPage(nextPosition, nextStep);
  }

  function focusApplicationForm(nextPosition = '') {
    openApplyPage(nextPosition, nextPosition ? 'role' : 'contact');
  }

  function updateScreeningAnswer(questionId, value) {
    const id = String(questionId || '').trim();
    if (!id) return;
    setScreeningState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: value },
      errors: { ...prev.errors, [questionId]: '' }
    }));
  }

  function updateField(field, value) {
    const nextValue = sanitizeField(field, value);

    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: nextValue,
      };

      const draft = {};
      ['name', 'email', 'mobile', 'position', 'experience', 'location'].forEach((key) => {
        if (nextForm[key]) {
          draft[key] = nextForm[key];
        }
      });
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Browser storage may be unavailable. Form still works.
      }

      return nextForm;
    });
    setAlert(null);

    if (validation[field] !== undefined) {
      setValidation((current) => ({
        ...current,
        [field]: validateValue(field, nextValue),
      }));
    }
  }

  function validateField(field, overrideValue) {
    const nextValue = overrideValue ?? form[field];
    const valid = field === 'position'
      ? positionOptions.some((option) => option.value && option.value === String(nextValue || ''))
      : validateValue(field, nextValue);
    setValidation((current) => ({
      ...current,
      [field]: valid,
    }));
    return valid;
  }

  function checkFile(file) {
    if (!file) {
      return { ok: false, message: 'Please select your CV or resume.' };
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mimeType = String(file.type || '').toLowerCase();
    const mimeTypeAllowed =
      !mimeType ||
      mimeType === 'application/octet-stream' ||
      ALLOWED_MIME_TYPES.has(mimeType);

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, message: 'File is too large. Maximum allowed size is 2MB.' };
    }

    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeTypeAllowed) {
      return { ok: false, message: 'Invalid file type. Upload PDF, DOC or DOCX only.' };
    }

    return { ok: true, message: '' };
  }

  function validateFile(file) {
    const result = checkFile(file);
    setFileState((prev) => ({ ...prev, error: result.message }));
    return result;
  }

  function handleFile(file) {
    if (!file) return;

    const result = validateFile(file);

    if (result.ok) {
      setFileState((prev) => ({ ...prev, selected: file, error: '' }));
      setAlert(null);
      return;
    }

    setFileState((prev) => ({ ...prev, selected: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showError(result.message);
  }

  function resetFileInput() {
    setFileState((prev) => ({ ...prev, selected: null, error: '', previewUrl: '' }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function resetTurnstile() {
    dispatchTurnstile({ type: 'RESET' });

    if (window.turnstile && typeof window.turnstile.reset === 'function' && globalTurnstileWidgetId) {
      window.turnstile.reset(globalTurnstileWidgetId);
    }
  }

  function validateFormBeforeSubmit() {
    const nameValid = validateField('name');
    const emailValid = validateField('email');
    const mobileValid = validateField('mobile');
    const locationValid = validateField('location');
    const positionValid = validateField('position');

    if (hpRef.current?.value) {
      return { ok: false, silent: true, message: 'Submission blocked.', stepKey: 'contact' };
    }

    if (Date.now() - formLoadTimeRef.current < 3000) {
      return { ok: false, message: 'Please take a moment to review the form before submitting.', stepKey: 'contact' };
    }

    if (!nameValid || !emailValid || !mobileValid || !locationValid || !positionValid) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        stepKey: !nameValid || !emailValid || !mobileValid || !locationValid ? 'contact' : 'role',
      };
    }

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.ok) {
      return { ok: false, message: fileValidation.message, stepKey: 'resume' };
    }

    const nextScreeningErrors = validateScreeningAnswers(activeScreeningQuestions, screeningAnswers);
    setScreeningErrors(nextScreeningErrors);
    if (Object.keys(nextScreeningErrors).length > 0) {
      return { ok: false, message: 'Please answer the required screening questions.', stepKey: 'role' };
    }

    if (!form.consent) {
      return { ok: false, message: 'Please confirm the recruitment consent before submitting.', stepKey: 'verify' };
    }

    if (!turnstile.token) {
      return { ok: false, message: 'Complete the verification section before submitting the application.', stepKey: 'verify' };
    }

    return { ok: true };
  }

  function validateContactStep() {
    const nameValid = validateField('name');
    const emailValid = validateField('email');
    const mobileValid = validateField('mobile');
    const locationValid = validateField('location');

    if (!nameValid || !emailValid || !mobileValid || !locationValid) {
      return {
        ok: false,
        message: 'Please complete the contact details before continuing.',
        stepKey: 'contact',
      };
    }

    return { ok: true };
  }

  function validateRoleStep() {
    const positionValid = validateField('position');
    if (!positionValid) {
      return {
        ok: false,
        message: 'Please select the position you want to apply for.',
        stepKey: 'role',
      };
    }

    const nextScreeningErrors = validateScreeningAnswers(activeScreeningQuestions, screeningAnswers);
    setScreeningErrors(nextScreeningErrors);
    if (Object.keys(nextScreeningErrors).length > 0) {
      return {
        ok: false,
        message: 'Please answer the required screening questions.',
        stepKey: 'role',
      };
    }

    return { ok: true };
  }

  function validateResumeStep() {
    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.ok) {
      return {
        ok: false,
        message: fileValidation.message,
        stepKey: 'resume',
      };
    }

    return { ok: true };
  }

  function validateVerifyStep() {
    if (!form.consent) {
      return {
        ok: false,
        message: 'Please confirm the recruitment consent before continuing.',
        stepKey: 'verify',
      };
    }

    if (!turnstile.token) {
      return {
        ok: false,
        message: 'Complete the verification section before continuing.',
        stepKey: 'verify',
      };
    }

    return { ok: true };
  }

  function handleStepContinue(stepKey) {
    let result = { ok: true };

    if (stepKey === 'contact') {
      result = validateContactStep();
    } else if (stepKey === 'role') {
      result = validateRoleStep();
    } else if (stepKey === 'resume') {
      result = validateResumeStep();
    } else if (stepKey === 'verify') {
      result = validateVerifyStep();
    }

    if (!result.ok) {
      showError(result.message, result.stepKey);
      return;
    }

    if (!turnstile.token) {
      showError('Please complete the security verification before applying.');
      return;
    }

    const currentIndex = STEP_ORDER.indexOf(stepKey);
    const nextStep = STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)];
    focusStep(nextStep);
  }

  function handleStepBack(stepKey) {
    const currentIndex = STEP_ORDER.indexOf(stepKey);
    const previousStep = STEP_ORDER[Math.max(0, currentIndex - 1)];
    focusStep(previousStep);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAlert(null);
    setSubmitState((prev) => ({ ...prev, submitAttempted: true }));
    let initCompleted = false;

    const validationResult = validateFormBeforeSubmit();
    if (!validationResult.ok) {
      if (!validationResult.silent) {
        showError(validationResult.message, validationResult.stepKey);
      }
      return;
    }

    try {
      setSubmitState((prev) => ({ ...prev, isSubmitting: true, buttonText: 'Creating application...' }));

      const selectedOption = positionOptions.find((option) => option.value === form.position) || null;
      const positionTitle = selectedOption?.label || '';
      const initPayload = {
        turnstile_token: turnstile.token,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        job_public_code: form.position,
        position_title: positionTitle,
        _hp_check: hpRef.current?.value || '',
        _timestamp: formLoadTimeRef.current,
        _token: sessionTokenRef.current,
      };
      if (sourceText) {
        initPayload.source = sourceText;
      }
      if (selectedOption?.dynamic && selectedOption.requirementId) {
        initPayload.requirement_id = selectedOption.requirementId;
      }
      if (selectedOption?.dynamic && activeScreeningQuestions.length > 0) {
        initPayload.screening_answers = screeningAnswers;
      }

      const initRes = await fetchWithTimeout(`${API_BASE}/v1/apply/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': sessionTokenRef.current,
          'X-Timestamp': String(formLoadTimeRef.current),
        },
        body: JSON.stringify(initPayload),
      });
      const initData = await initRes.json().catch(() => ({}));

      if (initRes.status === 429) {
        throw new Error(mapPublicApplyError({ status: initRes.status, payload: initData }));
      }

      if (!initRes.ok || !initData.success || !initData.apply_id) {
        throw new Error(
          mapPublicApplyError({
            status: initRes.status,
            payload: initData,
            fallback: 'Failed to submit the application.',
          })
        );
      }

      initCompleted = true;
      const applyId = initData.apply_id;
      setSubmitState((prev) => ({ ...prev, buttonText: 'Uploading CV...' }));

      const uploadFormData = new FormData();
      uploadFormData.append('apply_id', applyId);
      uploadFormData.append('cv', selectedFile);
      uploadFormData.append('experience', form.experience);
      uploadFormData.append('location', form.location.trim());

      const uploadRes = await fetchWithTimeout(`${API_BASE}/v1/apply/upload-cv`, {
        method: 'POST',
        headers: {
          'X-Request-ID': sessionTokenRef.current,
        },
        body: uploadFormData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));

      if (uploadRes.status === 429) {
        throw new Error(mapPublicApplyError({ status: uploadRes.status, payload: uploadData }));
      }

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(
          mapPublicApplyError({
            status: uploadRes.status,
            payload: uploadData,
            fallback: 'Failed to upload the CV.',
          })
        );
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setSubmitState((prev) => ({
        ...prev,
        isSubmitting: false,
        buttonText: 'Submit Application',
        successApplyId: applyId,
        submitted: true,
        submittedContext: {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          positionTitle: positionTitle || form.position,
          sourceDisplay: sourceText ? sourceDisplayText : '',
        },
      }));
    } catch (error) {
      setSubmitState((prev) => ({ ...prev, isSubmitting: false, buttonText: 'Submit Application' }));

      if (error?.name === 'AbortError') {
        if (initCompleted) {
          resetTurnstile();
        }
        showError('The request timed out. Please check your connection and try again.');
        return;
      }

      if (error instanceof TypeError) {
        if (initCompleted) {
          resetTurnstile();
        }
        showError('Could not reach the application API. If you are testing locally, run the app through Vite so the /api proxy is active. If this is deployed, enable CORS for this site on the backend.');
        return;
      }

      resetTurnstile();
      showError(error?.message || 'Something went wrong. Please try again.');
    }
  }

  async function handleCopyApplyId() {
    if (!submitState.successApplyId) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard_unavailable');
      }
      await navigator.clipboard.writeText(submitState.successApplyId);
      setSubmitState((prev) => ({ ...prev, copyFeedback: 'Application ID copied' }));
    } catch {
      setSubmitState((prev) => ({ ...prev, copyFeedback: 'Please copy the Application ID manually' }));
    }
  }

  const { isSubmitting, buttonText, submitted, successApplyId, submitAttempted, submittedContext, copyFeedback } = submitState;
  const { answers: screeningAnswers, errors: screeningErrors } = screeningState;
  const { selected: selectedFile, error: fileError, dragging, previewUrl: pdfPreviewUrl } = fileState;

  const nameError = getFieldError('name', validation.name);
  const emailError = getFieldError('email', validation.email);
  const mobileError = getFieldError('mobile', validation.mobile);
  const locationError = getFieldError('location', validation.location);
  const positionError = getFieldError('position', validation.position);
  const fileSizeText = selectedFile ? formatFileSize(selectedFile.size) : '';
  const submitDisabled = isSubmitting || turnstile.status !== 'verified';
  const consentInvalid = submitAttempted && !form.consent;
  const verificationInvalid = submitAttempted && !turnstile.token;
  const detailsReady =
    validateValue('name', form.name) &&
    validateValue('email', form.email) &&
    validateValue('mobile', form.mobile) &&
    validateValue('location', form.location);
  const screeningReady = Object.keys(validateScreeningAnswers(activeScreeningQuestions, screeningAnswers)).length === 0;
  const roleReady = positionOptions.some((option) => option.value && option.value === form.position) && screeningReady;
  const resumeReady = Boolean(selectedFile) && !fileError;
  const verificationReady = Boolean(form.consent) && Boolean(turnstile.token);
  const currentStep =
    !detailsReady ? 'contact' :
      !roleReady ? 'role' :
        !resumeReady ? 'resume' :
          !verificationReady ? 'verify' : 'done';
  const currentStepLabel =
    visibleStep === 'contact' ? 'Personal details' :
      visibleStep === 'role' ? 'Role and screening' :
        visibleStep === 'resume' ? 'Resume upload' :
          visibleStep === 'verify' ? 'Consent and verification' : 'Ready for final submission';

  const checklistItems = [
    ['Step 1', 'Contact details', 'Name, email, and optional contact details.', detailsReady, 'contact'],
    ['Step 2', 'Role and screening', 'Select an active role and complete any required pre-screening.', roleReady, 'role'],
    ['Step 3', 'Resume upload', 'Attach a supported PDF, DOC, or DOCX file.', resumeReady, 'resume'],
    ['Step 4', 'Consent and verify', 'Confirm consent and complete the secure check.', verificationReady, 'verify'],
  ];
  const visibleStepIndex = Math.max(0, STEP_ORDER.indexOf(visibleStep));

  const verificationLabel =
    turnstile.status === 'verified'
      ? 'Verified'
      : turnstile.status === 'error'
        ? 'Needs attention'
        : turnstile.status === 'expired'
          ? 'Expired'
          : turnstile.status === 'loading'
            ? 'Loading'
            : 'Pending';

  const verificationMessage =
    turnstile.status === 'verified'
      ? 'Verification completed. You can submit the application now.'
      : turnstile.status === 'error'
        ? 'Verification is not loading. Check your Turnstile domain settings or refresh the page.'
        : turnstile.status === 'expired'
          ? 'Verification expired. Please verify again before submitting.'
          : turnstile.status === 'loading'
            ? 'Preparing the secure verification widget. This usually takes a moment.'
            : 'Complete the secure verification before submitting your application.';
  const submittedWhatsappMessage = [
    'Hello NT Woods HR team,',
    'I have completed my careers application.',
    submittedContext.name ? `Name: ${submittedContext.name}` : '',
    submittedContext.positionTitle ? `Position: ${submittedContext.positionTitle}` : '',
    successApplyId ? `Application ID: ${successApplyId}` : '',
    submittedContext.mobile ? `Mobile: ${submittedContext.mobile}` : '',
    submittedContext.sourceDisplay ? `Source: ${submittedContext.sourceDisplay}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const showWhatsappButton = Boolean(
    publicConfig.whatsapp_enabled && isValidWhatsappNumber(publicConfig.whatsapp_number)
  );
  const whatsappConfirmationUrl = showWhatsappButton
    ? `https://wa.me/${publicConfig.whatsapp_number}?text=${encodeURIComponent(submittedWhatsappMessage)}`
    : '';
  const isApplyView = pageView === 'apply';

  return (
    <>
      <a className="skip-link" href="#apply-form" onClick={(event) => handleApplyNavigation(event, '', 'contact')}>Skip to application form</a>

      <header className="site-header" aria-label="NT Woods careers header">
        <div className="nav-shell">
          <a className="brand" href="#top" aria-label="NT Woods Careers home" onClick={(event) => handleBrowseNavigation(event, 'top')}>
            <span className="brand-mark">NT</span>
            <span>
              <span className="brand-title">NT Woods Careers</span>
              <span className="brand-subtitle">Professional hiring portal</span>
            </span>
          </a>

          <nav className="nav-links" aria-label="Page navigation">
            <a href="#roles" onClick={(event) => handleBrowseNavigation(event, 'roles')}>Open Roles</a>
            <a href="#process" onClick={(event) => handleBrowseNavigation(event, 'process')}>Hiring Process</a>
            <a href="#status-check" onClick={(event) => handleBrowseNavigation(event, 'status-check')}>Check Status</a>
            <a href="#faq" onClick={(event) => handleBrowseNavigation(event, 'faq')}>FAQ</a>
          </nav>

          <a className="nav-cta" href="#apply-form" onClick={(event) => handleApplyNavigation(event, '', 'contact')}>
            <Icon className="icon-inline" name="send" /> Apply Now
          </a>
        </div>
      </header>

      <main id="top">
        <section className={`hero ${isApplyView ? 'hero-apply' : ''}`} aria-labelledby={isApplyView ? 'apply-page-title' : 'hero-title'}>
          <div className={`page-shell hero-grid ${isApplyView ? 'hero-grid-apply' : ''}`}>
            {!isApplyView ? (
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true"></span>
                Hiring across business operations
              </span>
              <h1 id="hero-title">
                Build your career with <span className="hero-gradient-text">NT Woods</span>
              </h1>
              <p className="hero-lead">
                Submit your profile for available roles in Accounts, HR, Sales, Marketing, Admin and IT support. Our HR team will review your application and connect with shortlisted candidates.
              </p>

              <div className="hero-actions">
                <a className="btn-link-primary" href="#apply-form" onClick={(event) => handleApplyNavigation(event, '', 'contact')}>
                  <Icon className="icon-inline" name="send" /> Start Application
                </a>
                <a className="btn-link-secondary" href="#process" onClick={(event) => handleBrowseNavigation(event, 'process')}>View Process</a>
              </div>

              <div className="hero-stats" aria-label="Application overview">
                {heroStats.map((item) => (
                  <article className="hero-stat-card" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                    <small>{item.note}</small>
                  </article>
                ))}
              </div>

              <div className="hero-proof-grid" aria-label="Application highlights">
                {heroProofItems.map(([title, note]) => (
                  <article className="hero-proof-card" key={title}>
                    <strong>{title}</strong>
                    <span>{note}</span>
                  </article>
                ))}
              </div>

              <div className="info-panel" id="roles">
                <div className="info-panel-title">
                  <h2>Open role categories</h2>
                  {sourceText ? <span className="source-pill show">Source: {sourceDisplayText}</span> : <span className="source-pill" />}
                </div>
                <div className="role-grid">
                  {roleCards.map(([title, description]) => (
                    <div className="role-card" key={title}>
                      <b>{title}</b>
                      <small>{description}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            ) : null}

            <aside
              className={`application-shell ${isApplyView ? 'application-shell-full' : 'application-shell-preview'}`}
              id={isApplyView ? 'apply-form' : 'application'}
              aria-label={isApplyView ? 'Application form' : 'Application preview'}
            >
              {!isApplyView ? (
              <div className="application-card application-preview-card">
                <div className="application-stage-rail" aria-label="Application overview">
                  <div>
                    <span className="application-stage-kicker">Guided application</span>
                    <strong>Open the full submit flow on the next screen</strong>
                    <div className="application-stage-counter">4 guided steps</div>
                    <p>
                      Browse active openings here, then move into a dedicated application screen for contact details,
                      role screening, CV upload, and verification.
                    </p>
                  </div>
                  <div className="application-stage-pills">
                    <span className="application-stage-pill">{usingDynamicJobs ? 'Live roles synced' : 'Fallback roles ready'}</span>
                    <span className="application-stage-pill">Manual HR review</span>
                    <span className="application-stage-pill">Verification required</span>
                  </div>
                </div>

                <div className="preview-card-header">
                  <div>
                    <h2>Choose a role and continue</h2>
                    <p className="subtitle">`Apply Now` opens a dedicated application page so the full submit flow stays focused and easier to complete.</p>
                  </div>
                  <div className="preview-card-actions">
                    <a className="btn btn-primary" href="#apply-form" onClick={(event) => handleApplyNavigation(event, '', 'contact')}>
                      <Icon className="btn-icon" name="send" />
                      <span>Open application form</span>
                    </a>
                  </div>
                </div>

                <div className="security-row" aria-label="Security notes">
                  <span className="security-badge">
                    <Icon className="icon-inline" name="lock" />
                    Protected application submission
                  </span>
                  <span className="security-badge secondary">
                    <Icon className="icon-inline" name="shield" />
                    Verification enabled
                  </span>
                </div>

                <div className="progress-grid application-preview-grid" aria-label="Application steps">
                  {checklistItems.map(([step, title, note, ready, stepKey]) => (
                    <button
                      type="button"
                      className={`progress-card ${ready ? 'complete' : ''} ${currentStep === stepKey ? 'current' : ''}`}
                      key={title}
                      onClick={() => openApplyPage('', stepKey)}
                    >
                      <span className="progress-icon" aria-hidden="true">
                        <Icon className="icon-inline" name={ready ? 'checkCircle' : currentStep === stepKey ? 'arrowRight' : 'briefcase'} />
                      </span>
                      <div>
                        <small className="progress-stepLabel">{step}</small>
                        <strong>{title}</strong>
                        <span>{note}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {usingDynamicJobs ? (
                  <div className="job-browser" aria-label="Active approved jobs">
                    <div className="job-browser-header">
                      <div>
                        <h3>Live approved roles</h3>
                        <p>Open details here, then jump into the dedicated apply page with the role already selected.</p>
                      </div>
                    </div>
                    <div className="job-card-grid">
                      {(dynamicJobs || []).map((job) => (
                        <article key={job.value} className={`job-card ${form.position === job.value ? 'selected' : ''}`}>
                          <div className="job-card-top">
                            <div>
                              <strong>{job.label}</strong>
                              <span>{job.openingCount > 0 ? `${job.openingCount} opening${job.openingCount > 1 ? 's' : ''}` : 'Open role'}</span>
                            </div>
                            {form.position === job.value ? <span className="job-card-active">Selected</span> : null}
                          </div>
                          <div className="job-card-body">
                            <p className="job-card-summary">
                              {job.jobDescription || 'Public-safe role details are limited for this opening, but you can still continue with the application form now.'}
                            </p>
                            <div className="job-card-meta">
                              {job.location ? <span>Location: {job.location}</span> : null}
                              {job.experience ? <span>Experience: {job.experience}</span> : null}
                              <span>
                                {Array.isArray(job.screeningQuestions) && job.screeningQuestions.length > 0
                                  ? `${job.screeningQuestions.length} screening question${job.screeningQuestions.length > 1 ? 's' : ''}`
                                  : 'No pre-screening'}
                              </span>
                            </div>
                          </div>
                          <div className="job-card-actions">
                            <button type="button" className="job-card-link" onClick={() => setActiveJobModal(job)}>
                              <Icon className="icon-inline" name="search" /> View Details
                            </button>
                            <button type="button" className="job-card-apply" onClick={() => focusApplicationForm(job.value)}>
                              <Icon className="icon-inline" name="send" /> Apply Now
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="preview-fallback-panel">
                    <strong>Live roles are temporarily unavailable.</strong>
                    <p>Fallback role selection is still available inside the application page, so candidates can continue without losing the apply flow.</p>
                  </div>
                )}
              </div>
              ) : (
              <div ref={applicationCardRef} className="application-card">
                <div className="application-page-header">
                  <button type="button" className="btn-link-secondary application-page-back" onClick={() => openBrowsePage('roles')}>
                    Back to openings
                  </button>
                  <div>
                    <span className="application-stage-kicker">Dedicated application page</span>
                    <h1 id="apply-page-title" className="application-page-title">Complete your application</h1>
                    <p className="application-page-copy">Complete the guided form here without the rest of the landing page getting in the way.</p>
                  </div>
                </div>
                <div className="application-stage-rail" aria-label="Current form status">
                  <div>
                    <span className="application-stage-kicker">Candidate workspace</span>
                    <strong>{currentStepLabel}</strong>
                    <div className="application-stage-counter">Step {visibleStepIndex + 1} of {STEP_ORDER.length}</div>
                    <p>
                      {usingDynamicJobs
                        ? 'This form is using live approved role data from the HRMS.'
                        : 'Fallback roles are active so you can continue even if the live jobs feed is unavailable.'}
                    </p>
                  </div>
                  <div className="application-stage-pills">
                    <span className="application-stage-pill">{usingDynamicJobs ? 'Live roles' : 'Fallback roles'}</span>
                    <span className="application-stage-pill">{selectedFile ? fileTypeLabel(selectedFile) : 'CV pending'}</span>
                    <span className="application-stage-pill">{verificationLabel}</span>
                  </div>
                </div>
                {alert && (
                  <div ref={alertRef} className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`} role="alert" aria-live="polite">
                    <span className="alert-icon" aria-hidden="true">
                      <Icon className="icon-inline" name={alert.type === 'success' ? 'checkCircle' : 'alert'} />
                    </span>
                    <span>{alert.message}</span>
                  </div>
                )}

                {!submitted ? (
                  <div id="form-section">
                    <div className="form-header">
                      <div className="form-header-top">
                        <div className="form-icon" aria-hidden="true">
                          <Icon className="icon-lg" name="briefcase" />
                        </div>
                        <span className="form-tag">Protected 2-step application</span>
                      </div>
                      <h2>Submit your application</h2>
                      <p className="subtitle">Fill in your basic details, upload your CV, and complete verification before final submission.</p>
                      <div className="form-brief-grid" aria-label="Application summary">
                        {formHighlights.map(([label, value]) => (
                          <div className="form-brief-card" key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="security-row" aria-label="Security notes">
                        <span className="security-badge">
                          <Icon className="icon-inline" name="lock" />
                          Protected application submission
                        </span>
                        <span className="security-badge secondary">
                          <Icon className="icon-inline" name="shield" />
                          Verification enabled
                        </span>
                      </div>
                      <div className="progress-grid" aria-label="Application readiness">
                        {checklistItems.map(([step, title, note, ready, stepKey]) => (
                          <button
                            type="button"
                            className={`progress-card ${ready ? 'complete' : ''} ${visibleStep === stepKey ? 'current' : ''}`}
                            key={title}
                            aria-current={visibleStep === stepKey ? 'step' : undefined}
                            onClick={() => focusStep(stepKey)}
                          >
                            <span className="progress-icon" aria-hidden="true">
                              <Icon className="icon-inline" name={ready ? 'checkCircle' : visibleStep === stepKey ? 'arrowRight' : 'briefcase'} />
                            </span>
                            <div>
                              <small className="progress-stepLabel">{step}</small>
                              <strong>{title}</strong>
                              <span>{note}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {selectedPosition?.value ? (
                        <div className="apply-selected-role-banner" aria-live="polite">
                          <strong>Selected role: {selectedPosition.label}</strong>
                          <span>
                            {selectedPosition.dynamic
                              ? 'This role was preloaded from the live approved jobs list. You can change it in Step 2 if needed.'
                              : 'You can still change the role in Step 2 before final submission.'}
                          </span>
                        </div>
                      ) : (
                        <div className="apply-selected-role-banner muted">
                          <strong>No role selected yet</strong>
                          <span>{usingDynamicJobs ? 'Choose a live role in Step 2 to continue with screening and submission.' : 'Fallback role options are available in Step 2 so you can continue with the application.'}</span>
                        </div>
                      )}
                    </div>

                    <form id="apply-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
                      <div className="hp-field" aria-hidden="true">
                        <label htmlFor="_hp_check">Leave this empty</label>
                        <input ref={hpRef} type="text" id="_hp_check" name="_hp_check" tabIndex="-1" autoComplete="off" aria-label="Honeypot" />
                      </div>
                      <input type="hidden" id="_timestamp" name="_timestamp" value={formLoadTimeRef.current} readOnly />
                      <input type="hidden" id="_token" name="_token" value={sessionTokenRef.current} readOnly />

                      {visibleStep === 'contact' ? (
                      <section
                        ref={contactStepRef}
                        className={`form-step-block ${detailsReady ? 'is-complete' : ''} ${visibleStep === 'contact' ? 'is-current' : ''}`}
                        aria-labelledby="apply-step-contact"
                      >
                        <div className="form-step-header">
                          <div>
                            <div className="form-step-kicker">Step 1</div>
                            <h3 id="apply-step-contact">Personal details</h3>
                            <p>Enter the contact details HR should use for your application review.</p>
                          </div>
                          <span className={`form-step-state ${detailsReady ? 'complete' : visibleStep === 'contact' ? 'current' : ''}`}>
                            {detailsReady ? 'Ready' : visibleStep === 'contact' ? 'In progress' : 'Pending'}
                          </span>
                        </div>

                      <div className="form-group">
                        <label className="required" htmlFor="name">
                          <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="user" /></span>
                          Full Name
                        </label>
                        <div className="input-wrapper">
                          <input
                            ref={nameInputRef}
                            className={fieldClass(validation.name, form.name)}
                            type="text"
                            id="name"
                            placeholder="Enter your full name"
                            required
                            maxLength="100"
                            autoComplete="name"
                            value={form.name}
                            aria-invalid={validation.name === false}
                            aria-label="Full Name"
                            aria-describedby={nameError ? 'name-error' : undefined}
                            onChange={(event) => updateField('name', event.target.value)}
                            onBlur={() => validateField('name')}
                          />
                          <span className={`input-icon ${fieldIcon(validation.name, form.name) ? 'show' : ''} ${validation.name ? 'valid' : validation.name === false ? 'invalid' : ''}`} aria-hidden="true">
                            <Icon className="icon-inline" name={fieldIcon(validation.name, form.name)} />
                          </span>
                        </div>
                        {nameError ? <div className="field-error-note" id="name-error">{nameError}</div> : null}
                      </div>

                      <div className="form-group">
                        <label className="required" htmlFor="email">
                          <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="mail" /></span>
                          Email Address
                        </label>
                        <div className="input-wrapper">
                          <input
                            className={fieldClass(validation.email, form.email)}
                            type="email"
                            id="email"
                            placeholder="your.email@example.com"
                            required
                            maxLength="100"
                            autoComplete="email"
                            value={form.email}
                            aria-invalid={validation.email === false}
                            aria-label="Email Address"
                            aria-describedby={emailError ? 'email-error' : undefined}
                            onChange={(event) => updateField('email', event.target.value)}
                            onBlur={() => validateField('email')}
                          />
                          <span className={`input-icon ${fieldIcon(validation.email, form.email) ? 'show' : ''} ${validation.email ? 'valid' : validation.email === false ? 'invalid' : ''}`} aria-hidden="true">
                            <Icon className="icon-inline" name={fieldIcon(validation.email, form.email)} />
                          </span>
                        </div>
                        {emailError ? <div className="field-error-note" id="email-error">{emailError}</div> : null}
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="mobile">
                            <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="phone" /></span>
                            Mobile Number
                            <span className="field-hint-inline">(Optional)</span>
                          </label>
                          <div className="input-wrapper">
                            <input
                              className={fieldClass(validation.mobile, form.mobile)}
                              type="tel"
                              id="mobile"
                              placeholder="10-digit mobile number"
                              pattern="[6-9][0-9]{9}"
                              maxLength="10"
                              inputMode="numeric"
                              autoComplete="tel"
                              value={form.mobile}
                              aria-invalid={validation.mobile === false}
                              aria-label="Mobile Number"
                              aria-describedby={mobileError ? 'mobile-error' : undefined}
                              onChange={(event) => updateField('mobile', event.target.value)}
                              onBlur={() => validateField('mobile')}
                            />
                            <span className={`input-icon ${fieldIcon(validation.mobile, form.mobile) ? 'show' : ''} ${validation.mobile ? 'valid' : validation.mobile === false ? 'invalid' : ''}`} aria-hidden="true">
                              <Icon className="icon-inline" name={fieldIcon(validation.mobile, form.mobile)} />
                            </span>
                          </div>
                          {mobileError ? <div className="field-error-note" id="mobile-error">{mobileError}</div> : null}
                        </div>

                        <div className="form-group">
                          <label htmlFor="location">
                            <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="pin" /></span>
                            Current Location
                          </label>
                          <input
                            className={fieldClass(validation.location, form.location)}
                            type="text"
                            id="location"
                            placeholder="City, State"
                            maxLength="100"
                            autoComplete="address-level2"
                            value={form.location}
                            aria-invalid={validation.location === false}
                            aria-label="Current Location"
                            aria-describedby={locationError ? 'location-error' : undefined}
                            onChange={(event) => updateField('location', event.target.value)}
                            onBlur={() => validateField('location')}
                          />
                          {locationError ? <div className="field-error-note" id="location-error">{locationError}</div> : null}
                        </div>
                      </div>
                      <div className="step-actions">
                        <button type="button" className="btn btn-primary" onClick={() => handleStepContinue('contact')}>
                          <span>Continue to role selection</span>
                          <Icon className="btn-icon" name="arrowRight" />
                        </button>
                      </div>
                      </section>
                      ) : null}

                      {visibleStep === 'role' ? (
                      <section
                        ref={roleStepRef}
                        className={`form-step-block ${roleReady ? 'is-complete' : ''} ${visibleStep === 'role' ? 'is-current' : ''}`}
                        aria-labelledby="apply-step-role"
                      >
                        <div className="form-step-header">
                          <div>
                            <div className="form-step-kicker">Step 2</div>
                            <h3 id="apply-step-role">Role preference</h3>
                            <p>Select the position you want to apply for. Role-specific questions appear only when needed.</p>
                          </div>
                          <span className={`form-step-state ${roleReady ? 'complete' : visibleStep === 'role' ? 'current' : ''}`}>
                            {roleReady ? 'Ready' : visibleStep === 'role' ? 'In progress' : 'Pending'}
                          </span>
                        </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="required" htmlFor="position">
                            <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="briefcase" /></span>
                            Position Applying For
                          </label>
                          <select
                            ref={positionInputRef}
                            className={validation.position === false ? 'invalid' : ''}
                            id="position"
                            autoComplete="organization-title"
                            required
                            value={form.position}
                            aria-invalid={validation.position === false}
                            aria-label="Position Applying For"
                            aria-describedby={positionError ? 'position-error' : undefined}
                            onBlur={() => validateField('position')}
                            onChange={(event) => {
                              updateField('position', event.target.value);
                              setValidation((current) => ({
                                ...current,
                                position: positionOptions.some((option) => option.value && option.value === event.target.value),
                              }));
                            }}
                          >
                            {positionOptions.map((option) => (
                              <option key={option.value || 'empty'} value={option.value}>
                                {option.label}
                                {usingDynamicJobs && option.openingCount > 0 ? ` (${option.openingCount} opening${option.openingCount > 1 ? 's' : ''})` : ''}
                              </option>
                            ))}
                          </select>
                          {positionError ? <div className="field-error-note" id="position-error">{positionError}</div> : null}
                        </div>

                        <div className="form-group">
                          <label htmlFor="experience">
                            <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="clock" /></span>
                            Experience
                          </label>
                          <select id="experience" value={form.experience} aria-label="Experience" onChange={(event) => updateField('experience', event.target.value)}>
                            {experienceOptions.map(([value, label]) => (
                              <option key={value || 'empty'} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ScreeningQuestionsSection
                        questions={activeScreeningQuestions}
                        answers={screeningAnswers}
                        errors={screeningErrors}
                        onAnswerChange={updateScreeningAnswer}
                      />
                      {selectedPosition?.dynamic && activeScreeningQuestions.length === 0 ? (
                        <p className="screening-section-empty">No pre-screening questions are required for this role right now.</p>
                      ) : null}
                      <div className="step-actions step-actions-split">
                        <button type="button" className="btn-link-secondary step-backButton" onClick={() => handleStepBack('role')}>
                          Back
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleStepContinue('role')}>
                          <span>Continue to resume upload</span>
                          <Icon className="btn-icon" name="arrowRight" />
                        </button>
                      </div>
                      </section>
                      ) : null}

                      {visibleStep === 'resume' ? (
                      <section
                        ref={resumeStepRef}
                        className={`form-step-block ${resumeReady ? 'is-complete' : ''} ${visibleStep === 'resume' ? 'is-current' : ''}`}
                        aria-labelledby="apply-step-resume"
                      >
                        <div className="form-step-header">
                          <div>
                            <div className="form-step-kicker">Step 3</div>
                            <h3 id="apply-step-resume">Resume upload</h3>
                            <p>Upload your latest CV. PDF gives the best preview experience before submission.</p>
                          </div>
                          <span className={`form-step-state ${resumeReady ? 'complete' : visibleStep === 'resume' ? 'current' : ''}`}>
                            {resumeReady ? 'Ready' : visibleStep === 'resume' ? 'In progress' : 'Pending'}
                          </span>
                        </div>

                      <div className="form-group file-input">
                        <label className="required" htmlFor="cv">
                          <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="file" /></span>
                          Resume / CV
                        </label>
                        <FileDropzone
                        selectedFile={selectedFile}
                        dragging={dragging}
                        setDragging={(val) => setFileState(prev => ({ ...prev, dragging: val }))}
                        handleFile={handleFile}
                        fileInputRef={fileInputRef}
                        resetFileInput={resetFileInput}
                        fileError={fileError}
                        fileSizeText={fileSizeText}
                        pdfPreviewUrl={pdfPreviewUrl}
                      />
                    </div>
                      <div className="step-actions step-actions-split">
                        <button type="button" className="btn-link-secondary step-backButton" onClick={() => handleStepBack('resume')}>
                          Back
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleStepContinue('resume')}>
                          <span>Continue to verification</span>
                          <Icon className="btn-icon" name="arrowRight" />
                        </button>
                      </div>
                      </section>
                      ) : null}

                      {visibleStep === 'verify' ? (
                      <section
                        ref={verifyStepRef}
                        className={`form-step-block ${verificationReady ? 'is-complete' : ''} ${visibleStep === 'verify' ? 'is-current' : ''}`}
                        aria-labelledby="apply-step-verify"
                      >
                        <div className="form-step-header">
                          <div>
                            <div className="form-step-kicker">Step 4</div>
                            <h3 id="apply-step-verify">Consent and verification</h3>
                            <p>Confirm consent and finish the secure verification before final submission.</p>
                          </div>
                          <span className={`form-step-state ${verificationReady ? 'complete' : visibleStep === 'verify' ? 'current' : ''}`}>
                            {verificationReady ? 'Ready' : visibleStep === 'verify' ? 'In progress' : 'Pending'}
                          </span>
                        </div>

                      <div className={`consent-card ${consentInvalid ? 'invalid' : ''}`}>
                        <input
                          type="checkbox"
                          id="consent"
                          required
                          checked={form.consent}
                          aria-invalid={consentInvalid}
                          aria-label="Recruitment Consent"
                          onChange={(event) => {
                            setForm((current) => ({
                              ...current,
                              consent: event.target.checked,
                            }));
                            setAlert(null);
                          }}
                        />
                        <label htmlFor="consent">
                          I confirm that the information provided is correct and may be used by NT Woods for recruitment communication and application review.
                        </label>
                      </div>

                      <div className={`turnstile-container ${verificationInvalid ? 'invalid' : ''}`} aria-label="Verification">
                        <div className="verification-header">
                          <div>
                            <strong>Security verification</strong>
                            <span>Complete this secure check to activate final submission.</span>
                          </div>
                          <span className={`verification-chip verification-chip-${turnstile.status}`}>{verificationLabel}</span>
                        </div>
                        <div ref={turnstileRef} className={`turnstile-widget turnstile-widget-${turnstile.status}`} />
                        <p className={`verification-note verification-${turnstile.status}`}>{verificationMessage}</p>
                      </div>

                      <div className="step-actions step-actions-split">
                        <button type="button" className="btn-link-secondary step-backButton" onClick={() => handleStepBack('verify')} disabled={isSubmitting}>
                          Back
                        </button>
                        <button type="submit" className="btn btn-primary" id="btn-submit" disabled={submitDisabled}>
                          {!isSubmitting ? <Icon className="btn-icon" name="send" /> : <span className="spinner" aria-hidden="true" />}
                          <span id="btn-text">{buttonText}</span>
                        </button>
                      </div>

                      <p className="form-footnote">Submit your CV and contact details only once for the same role. Verification must be completed before submission.</p>
                      </section>
                      ) : null}
                    </form>
                  </div>
                ) : (
                  <div id="success" className="success-screen" aria-live="polite">
                    <div className="success-icon" aria-hidden="true">
                      <Icon className="icon-xl" name="check" />
                    </div>
                    <div className="success-message">
                      <h2>Application submitted successfully</h2>
                      <p>Thank you for applying. Our HR team will review your application and contact you if your profile matches the current requirement.</p>
                      {successApplyId ? <div className="application-id-box">Application ID: <span>{successApplyId}</span></div> : null}
                      <div className="success-summary-grid">
                        {submittedContext.positionTitle ? (
                          <div className="success-summary-card">
                            <span>Position applied for</span>
                            <strong>{submittedContext.positionTitle}</strong>
                          </div>
                        ) : null}
                        <div className="success-summary-card">
                          <span>Review path</span>
                          <strong>Manual HR review</strong>
                        </div>
                        <div className="success-summary-card">
                          <span>Source</span>
                          <strong>{submittedContext.sourceDisplay || 'Website / Direct'}</strong>
                        </div>
                      </div>
                      <div className="success-actionRow">
                        {successApplyId ? (
                          <button type="button" className="btn-link-secondary success-actionButton" onClick={handleCopyApplyId}>
                            Copy Application ID
                          </button>
                        ) : null}
                        {showWhatsappButton ? (
                          <a
                            className="btn-link-primary success-actionButton"
                            href={whatsappConfirmationUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Confirm on WhatsApp
                            <Icon className="icon-inline" name="arrowRight" />
                          </a>
                        ) : null}
                      </div>
                      {copyFeedback ? <div className="success-inlineFeedback">{copyFeedback}</div> : null}
                      <div className="success-details">
                        <p><strong>What happens next?</strong></p>
                        <ul className="success-list">
                          <li>Your application will be reviewed by the HR team.</li>
                          <li>Shortlisted candidates will be contacted for the next stage.</li>
                          <li>Please keep your phone and email available for updates.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}
            </aside>
          </div>
        </section>

        <JobDetailsModal
          job={activeJobModal}
          onClose={() => setActiveJobModal(null)}
          onApplyNow={() => {
            const nextJobCode = activeJobModal?.value || '';
            setActiveJobModal(null);
            focusApplicationForm(nextJobCode);
          }}
        />
        {/* legacy inline modal removed in favor of shared component
          <div className="job-modal-backdrop" role="presentation" onClick={() => setActiveJobModal(null)}>
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
                  <h3 id="job-modal-title">{activeJobModal.label}</h3>
                  {activeJobModal.openingCount > 0 ? (
                    <span className="job-card-active">{activeJobModal.openingCount} opening{activeJobModal.openingCount > 1 ? 's' : ''}</span>
                  ) : null}
                </div>
                <button type="button" className="job-modal-close" onClick={() => setActiveJobModal(null)} aria-label="Close job details">
                  ×
                </button>
              </div>

              {hasExtendedJobDetails(activeJobModal) ? (
                <div className="job-modal-body">
                  {activeJobModal.jobDescription ? (
                    <div className="job-modal-section">
                      <h4>Role summary</h4>
                      <p>{activeJobModal.jobDescription}</p>
                    </div>
                  ) : null}
                  {activeJobModal.skills ? (
                    <div className="job-modal-section">
                      <h4>Skills</h4>
                      <p>{activeJobModal.skills}</p>
                    </div>
                  ) : null}
                  {activeJobModal.location || activeJobModal.experience ? (
                    <div className="job-modal-meta">
                      {activeJobModal.location ? <span><strong>Location:</strong> {activeJobModal.location}</span> : null}
                      {activeJobModal.experience ? <span><strong>Experience:</strong> {activeJobModal.experience}</span> : null}
                    </div>
                  ) : null}
                  {Array.isArray(activeJobModal.screeningQuestions) && activeJobModal.screeningQuestions.length > 0 ? (
                    <div className="job-modal-section">
                      <h4>Pre-screening</h4>
                      <ul className="job-modal-list">
                        {activeJobModal.screeningQuestions.map((question) => (
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
                <button type="button" className="btn-link-secondary" onClick={() => setActiveJobModal(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn-link-primary"
                  onClick={() => {
                    const nextJobCode = activeJobModal.value;
                    setActiveJobModal(null);
                    focusApplicationForm(nextJobCode);
                  }}
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        ) : null} */}

        {!isApplyView ? (
        <>
        <StatusCheckSection />
        <WhyApplySection />
        <ProcessSection />
        <FAQSection />
        </>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-shell">
          <div><strong>NT Woods Careers</strong> | Recruitment application portal</div>
          <p>Candidate information is used only for hiring and recruitment review purposes.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
