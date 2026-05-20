import React, { useEffect, useRef, useState } from 'react';
import { API_BASE, TURNSTILE_SITE_KEY } from './config.js';
import {
  fileTypeLabel,
  formatFileSize,
  isPreviewablePdfFile,
  mapPublicApplyError,
  validateScreeningAnswers,
} from './publicApplyUi.js';
import {
  JobDetailsModal,
  ResumePreviewCard,
  ScreeningQuestionsSection,
} from './publicApplyComponents.jsx';

const DRAFT_KEY = 'ntw_careers_apply_draft_v1';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const ALLOWED_MIME_TYPES = new Set([
  '',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const initialForm = {
  name: '',
  email: '',
  mobile: '',
  location: '',
  position: '',
  experience: '',
  consent: false,
};

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

const fallbackPositionOptions = fallbackPositions.map(([value, label]) => ({
  value,
  label,
  requirementId: '',
  dynamic: false,
}));
const VALID_EXPERIENCE = new Set(experienceOptions.map(([value]) => value).filter(Boolean));

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

function getDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
    return { ...initialForm, ...draft, consent: false };
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return initialForm;
  }
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

function App() {
  const [form, setForm] = useState(getDraft);
  const [validation, setValidation] = useState({});
  const [alert, setAlert] = useState(null);
  const [dynamicJobs, setDynamicJobs] = useState([]);
  const [publicConfig, setPublicConfig] = useState({ whatsapp_enabled: false, whatsapp_number: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileStatus, setTurnstileStatus] = useState('loading');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonText, setButtonText] = useState('Submit Application');
  const [successApplyId, setSuccessApplyId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [submittedContext, setSubmittedContext] = useState({
    name: '',
    mobile: '',
    positionTitle: '',
    sourceDisplay: '',
  });
  const [statusForm, setStatusForm] = useState({ applyId: '', email: '' });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusResult, setStatusResult] = useState(null);
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningErrors, setScreeningErrors] = useState({});

  const fileInputRef = useRef(null);
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const alertRef = useRef(null);
  const hpRef = useRef(null);
  const applicationCardRef = useRef(null);
  const positionInputRef = useRef(null);
  const sourceTextRef = useRef(getSourceText());
  const sessionTokenRef = useRef(generateToken());
  const formLoadTimeRef = useRef(Date.now());
  const sourceText = sourceTextRef.current;
  const sourceDisplayText = formatSourceLabel(sourceText);
  const usingDynamicJobs = dynamicJobs.length > 0;
  const positionOptions = usingDynamicJobs
    ? [{ value: '', label: 'Select a position', requirementId: '', dynamic: false }, ...dynamicJobs]
    : fallbackPositionOptions;
  const selectedPosition = positionOptions.find((option) => option.value === form.position) || null;
  const activeScreeningQuestions = Array.isArray(selectedPosition?.screeningQuestions) ? selectedPosition.screeningQuestions : [];
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

  useEffect(() => {
    let cancelled = false;
    let checks = 0;

    const renderTurnstile = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile || turnstileWidgetIdRef.current) {
        return;
      }

      try {
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'normal',
          theme: 'light',
          callback: (token) => {
            setTurnstileToken(token || '');
            setTurnstileStatus(token ? 'verified' : 'ready');
            setAlert(null);
          },
          'expired-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('expired');
            showError('Verification expired. Please complete the secure check again.');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('error');
            showError('Verification could not load correctly. Confirm this domain is allowed in Cloudflare Turnstile settings, then refresh and try again.');
          },
        });
        setTurnstileStatus('ready');
      } catch {
        setTurnstileStatus('error');
      }
    };

    renderTurnstile();

    const turnstileWatch = window.setInterval(() => {
      checks += 1;
      renderTurnstile();

      if (turnstileWidgetIdRef.current) {
        window.clearInterval(turnstileWatch);
      } else if (checks >= 30) {
        setTurnstileStatus('error');
        window.clearInterval(turnstileWatch);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(turnstileWatch);

      if (window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Widget may already be removed by the browser.
        }
      }

      turnstileWidgetIdRef.current = null;
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
          const nextJobs = items
            .map((item) => ({
              value: String(item?.job_public_code || '').trim(),
              label: String(item?.position_title || '').trim(),
              requirementId: String(item?.requirement_id || '').trim(),
              openingCount: Number(item?.opening_count || 0),
              location: String(item?.location || '').trim(),
              experience: String(item?.experience || '').trim(),
              jobDescription: String(item?.job_description || '').trim(),
              skills: String(item?.skills || '').trim(),
              screeningQuestions: Array.isArray(item?.screening_questions) ? item.screening_questions : [],
              dynamic: true,
            }))
            .filter((item) => item.value && item.label);
          if (!cancelled && nextJobs.length > 0) {
            setDynamicJobs(nextJobs);
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
    const draft = {};

    ['name', 'email', 'mobile', 'position', 'experience', 'location'].forEach((key) => {
      if (form[key]) {
        draft[key] = form[key];
      }
    });

    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Browser storage may be unavailable. Form still works.
    }
  }, [form.email, form.experience, form.location, form.mobile, form.name, form.position]);

  useEffect(() => {
    if (!copyFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setCopyFeedback(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  useEffect(() => {
    if (!selectedFile || !isPreviewablePdfFile(selectedFile)) {
      setPdfPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPdfPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!form.position) return;
    const activeOptions = dynamicJobs.length ? dynamicJobs : fallbackPositionOptions;
    if (activeOptions.some((option) => option.value && option.value === form.position)) return;
    setForm((current) => ({ ...current, position: '' }));
    setValidation((current) => ({ ...current, position: undefined }));
  }, [dynamicJobs, form.position]);

  useEffect(() => {
    if (!activeScreeningQuestions.length) {
      setScreeningAnswers({});
      setScreeningErrors({});
      return;
    }
    const validIds = new Set(activeScreeningQuestions.map((question) => String(question?.id || '').trim()).filter(Boolean));
    setScreeningAnswers((current) => {
      const next = {};
      for (const [key, value] of Object.entries(current || {})) {
        if (validIds.has(key)) next[key] = value;
      }
      return next;
    });
    setScreeningErrors((current) => {
      const next = {};
      for (const [key, value] of Object.entries(current || {})) {
        if (validIds.has(key)) next[key] = value;
      }
      return next;
    });
  }, [activeScreeningQuestions]);

  function showError(message) {
    setAlert({ type: 'error', message });

    window.requestAnimationFrame(() => {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function focusApplicationForm(nextPosition = '') {
    if (nextPosition) {
      updateField('position', nextPosition);
      setValidation((current) => ({ ...current, position: true }));
    }
    window.requestAnimationFrame(() => {
      applicationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      positionInputRef.current?.focus();
    });
  }

  function updateScreeningAnswer(questionId, value) {
    const id = String(questionId || '').trim();
    if (!id) return;
    setScreeningAnswers((current) => ({ ...current, [id]: String(value || '') }));
    setScreeningErrors((current) => {
      if (!current?.[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function updateField(field, value) {
    const nextValue = sanitizeField(field, value);

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
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
    setFileError(result.message);
    return result;
  }

  function handleFile(file) {
    if (!file) return;

    const result = validateFile(file);

    if (result.ok) {
      setSelectedFile(file);
      setAlert(null);
      return;
    }

    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showError(result.message);
  }

  function resetFileInput() {
    setSelectedFile(null);
    setFileError('');
    setDragging(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function resetTurnstile() {
    setTurnstileToken('');
    setTurnstileStatus('ready');

    if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  function validateFormBeforeSubmit() {
    const nameValid = validateField('name');
    const emailValid = validateField('email');
    const mobileValid = validateField('mobile');
    const locationValid = validateField('location');
    const positionValid = validateField('position');

    if (hpRef.current?.value) {
      return { ok: false, silent: true, message: 'Submission blocked.' };
    }

    if (Date.now() - formLoadTimeRef.current < 3000) {
      return { ok: false, message: 'Please take a moment to review the form before submitting.' };
    }

    if (!nameValid || !emailValid || !mobileValid || !locationValid || !positionValid) {
      return { ok: false, message: 'Please fix the highlighted fields.' };
    }

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.ok) {
      return { ok: false, message: fileValidation.message };
    }

    const nextScreeningErrors = validateScreeningAnswers(activeScreeningQuestions, screeningAnswers);
    setScreeningErrors(nextScreeningErrors);
    if (Object.keys(nextScreeningErrors).length > 0) {
      return { ok: false, message: 'Please answer the required screening questions.' };
    }

    if (!form.consent) {
      return { ok: false, message: 'Please confirm the recruitment consent before submitting.' };
    }

    if (!turnstileToken) {
      return { ok: false, message: 'Complete the verification section before submitting the application.' };
    }

    return { ok: true };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAlert(null);
    setSubmitAttempted(true);
    let initCompleted = false;

    const validationResult = validateFormBeforeSubmit();
    if (!validationResult.ok) {
      if (!validationResult.silent) {
        showError(validationResult.message);
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setButtonText('Creating application...');

      const selectedOption = positionOptions.find((option) => option.value === form.position) || null;
      const positionTitle = selectedOption?.label || '';
      const initPayload = {
        turnstile_token: turnstileToken,
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
      setButtonText('Uploading CV...');

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
      setSuccessApplyId(applyId);
      setSubmittedContext({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        positionTitle: positionTitle || form.position,
        sourceDisplay: sourceText ? sourceDisplayText : '',
      });
      setSubmitted(true);
      setIsSubmitting(false);
    } catch (error) {
      setIsSubmitting(false);
      setButtonText('Submit Application');

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
    if (!successApplyId) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard_unavailable');
      }
      await navigator.clipboard.writeText(successApplyId);
      setCopyFeedback('Application ID copied');
    } catch {
      setCopyFeedback('Please copy the Application ID manually');
    }
  }

  function updateStatusField(field, value) {
    setStatusForm((current) => ({
      ...current,
      [field]: field === 'email' ? String(value || '').trim() : String(value || '').trim(),
    }));
    setStatusError('');
    setStatusResult(null);
  }

  async function handleStatusCheck(event) {
    event.preventDefault();
    setStatusError('');
    setStatusResult(null);

    const applyId = String(statusForm.applyId || '').trim();
    const email = String(statusForm.email || '').trim().toLowerCase();
    if (!applyId || !validateValue('email', email)) {
      setStatusError('Please enter the Application ID and the same email used for the application.');
      return;
    }

    try {
      setStatusLoading(true);
      const response = await fetchWithTimeout(`${API_BASE}/v1/apply/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apply_id: applyId,
          email,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error(mapPublicApplyError({ status: response.status, payload }));
      }
      if (!response.ok || !payload?.success) {
        setStatusError('We could not verify those application details. Please check the Application ID and email.');
        return;
      }

      setStatusResult({
        applyId: payload.apply_id,
        statusLabel: payload.status_label,
        positionTitle: payload.position_title,
        appliedAt: payload.applied_at,
        source: payload.source,
      });
    } catch (error) {
      setStatusError(error?.message || 'Unable to check application status right now.');
    } finally {
      setStatusLoading(false);
    }
  }

  const nameError = getFieldError('name', validation.name);
  const emailError = getFieldError('email', validation.email);
  const mobileError = getFieldError('mobile', validation.mobile);
  const locationError = getFieldError('location', validation.location);
  const positionError = getFieldError('position', validation.position);
  const fileSizeText = selectedFile ? formatFileSize(selectedFile.size) : '';
  const submitDisabled = isSubmitting || turnstileStatus === 'loading';
  const consentInvalid = submitAttempted && !form.consent;
  const verificationInvalid = submitAttempted && !turnstileToken;
  const detailsReady = validateValue('name', form.name) && validateValue('email', form.email);
  const roleReady = positionOptions.some((option) => option.value && option.value === form.position) && Boolean(selectedFile) && !fileError;
  const verificationReady = Boolean(form.consent) && Boolean(turnstileToken);

  const checklistItems = [
    ['Contact details', 'Name and email are required.', detailsReady],
    ['Role and resume', 'Choose a role and upload a supported CV.', roleReady],
    ['Consent and verify', 'Confirm consent and complete the secure check.', verificationReady],
  ];

  const verificationLabel =
    turnstileStatus === 'verified'
      ? 'Verified'
      : turnstileStatus === 'error'
        ? 'Needs attention'
        : turnstileStatus === 'expired'
          ? 'Expired'
          : turnstileStatus === 'loading'
            ? 'Loading'
            : 'Pending';

  const verificationMessage =
    turnstileStatus === 'verified'
      ? 'Verification completed. You can submit the application now.'
      : turnstileStatus === 'error'
        ? 'Verification is not loading. Check your Turnstile domain settings or refresh the page.'
        : turnstileStatus === 'expired'
          ? 'Verification expired. Please verify again before submitting.'
          : turnstileStatus === 'loading'
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

  return (
    <>
      <a className="skip-link" href="#application">Skip to application form</a>

      <header className="site-header" aria-label="NT Woods careers header">
        <div className="nav-shell">
          <a className="brand" href="#top" aria-label="NT Woods Careers home">
            <span className="brand-mark">NT</span>
            <span>
              <span className="brand-title">NT Woods Careers</span>
              <span className="brand-subtitle">Professional hiring portal</span>
            </span>
          </a>

          <nav className="nav-links" aria-label="Page navigation">
            <a href="#roles">Open Roles</a>
            <a href="#process">Hiring Process</a>
            <a href="#status-check">Check Status</a>
            <a href="#faq">FAQ</a>
          </nav>

          <a className="nav-cta" href="#application">
            Apply Now
            <Icon className="icon-inline" name="arrowRight" />
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="page-shell hero-grid">
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
                <a className="btn-link-primary" href="#application">
                  Start Application
                  <Icon className="icon-inline" name="arrowRight" />
                </a>
                <a className="btn-link-secondary" href="#process">View Process</a>
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

              <div className="trust-strip" aria-label="Application highlights">
                <div className="trust-item">
                  <strong>Protected Form</strong>
                  <span>Turnstile verification and bot checks are enabled.</span>
                </div>
                <div className="trust-item">
                  <strong>HR Review</strong>
                  <span>Applications are reviewed by the internal HR team.</span>
                </div>
                <div className="trust-item">
                  <strong>Fast Apply</strong>
                  <span>Keep your CV ready and complete the form in minutes.</span>
                </div>
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

            <aside className="application-shell" id="application" aria-label="Application form">
                  <div ref={applicationCardRef} className="application-card">
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
                        {checklistItems.map(([title, note, ready]) => (
                          <div className={`progress-card ${ready ? 'complete' : ''}`} key={title}>
                            <span className="progress-icon" aria-hidden="true">
                              <Icon className="icon-inline" name={ready ? 'checkCircle' : 'briefcase'} />
                            </span>
                            <div>
                              <strong>{title}</strong>
                              <span>{note}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {usingDynamicJobs ? (
                        <div className="job-browser" aria-label="Active approved jobs">
                          <div className="job-browser-header">
                            <div>
                              <h3>Live approved roles</h3>
                              <p>Browse active openings, review public-safe details, and move straight into the form.</p>
                            </div>
                          </div>
                          <div className="job-card-grid">
                            {dynamicJobs.map((job) => (
                              <article key={job.value} className={`job-card ${form.position === job.value ? 'selected' : ''}`}>
                                <div className="job-card-top">
                                  <div>
                                    <strong>{job.label}</strong>
                                    <span>{job.openingCount > 0 ? `${job.openingCount} opening${job.openingCount > 1 ? 's' : ''}` : 'Open role'}</span>
                                  </div>
                                  {form.position === job.value ? <span className="job-card-active">Selected</span> : null}
                                </div>
                                <div className="job-card-actions">
                                  <button type="button" className="job-card-link" onClick={() => setActiveJobModal(job)}>
                                    View Details
                                  </button>
                                  <button type="button" className="job-card-apply" onClick={() => focusApplicationForm(job.value)}>
                                    Apply Now
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <form id="apply-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
                      <div className="hp-field" aria-hidden="true">
                        <label htmlFor="_hp_check">Leave this empty</label>
                        <input ref={hpRef} type="text" id="_hp_check" name="_hp_check" tabIndex="-1" autoComplete="off" />
                      </div>
                      <input type="hidden" id="_timestamp" name="_timestamp" value={formLoadTimeRef.current} readOnly />
                      <input type="hidden" id="_token" name="_token" value={sessionTokenRef.current} readOnly />

                      <div className="form-section-title">Personal details</div>

                      <div className="form-group">
                        <label className="required" htmlFor="name">
                          <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="user" /></span>
                          Full Name
                        </label>
                        <div className="input-wrapper">
                          <input
                            className={fieldClass(validation.name, form.name)}
                            type="text"
                            id="name"
                            placeholder="Enter your full name"
                            required
                            maxLength="100"
                            autoComplete="name"
                            value={form.name}
                            aria-invalid={validation.name === false}
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
                            aria-describedby={locationError ? 'location-error' : undefined}
                            onChange={(event) => updateField('location', event.target.value)}
                            onBlur={() => validateField('location')}
                          />
                          {locationError ? <div className="field-error-note" id="location-error">{locationError}</div> : null}
                        </div>
                      </div>

                      <div className="form-section-title">Role preference</div>

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
                          <select id="experience" value={form.experience} onChange={(event) => updateField('experience', event.target.value)}>
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

                      <div className="form-section-title">Resume upload</div>

                      <div className="form-group file-input">
                        <label className="required" htmlFor="cv">
                          <span className="label-icon" aria-hidden="true"><Icon className="icon-inline" name="file" /></span>
                          Resume / CV
                        </label>
                        <div
                          className={`file-dropzone ${dragging ? 'dragging' : ''}`}
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
                            aria-describedby="file-help"
                            onChange={(event) => handleFile(event.target.files?.[0])}
                          />
                          <div
                            className={`file-label ${selectedFile ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
                            role="button"
                            tabIndex="0"
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                fileInputRef.current?.click();
                              }
                            }}
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
                        </div>
                        {fileError ? <div className="field-error-note">{fileError}</div> : null}
                        <ResumePreviewCard
                          file={selectedFile}
                          fileSizeText={fileSizeText}
                          pdfPreviewUrl={pdfPreviewUrl}
                          onChangeFile={() => fileInputRef.current?.click()}
                        />
                      </div>

                      <div className={`consent-card ${consentInvalid ? 'invalid' : ''}`}>
                        <input
                          type="checkbox"
                          id="consent"
                          required
                          checked={form.consent}
                          aria-invalid={consentInvalid}
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
                          <span className={`verification-chip verification-chip-${turnstileStatus}`}>{verificationLabel}</span>
                        </div>
                        <div ref={turnstileRef} className={`turnstile-widget turnstile-widget-${turnstileStatus}`} />
                        <p className={`verification-note verification-${turnstileStatus}`}>{verificationMessage}</p>
                      </div>

                      <button type="submit" className="btn btn-primary" id="btn-submit" disabled={submitDisabled}>
                        <span id="btn-text">{buttonText}</span>
                        {!isSubmitting ? <Icon className="btn-icon" name="arrowRight" /> : <span className="spinner" aria-hidden="true" />}
                      </button>

                      <p className="form-footnote">Submit your CV and contact details only once for the same role. Verification must be completed before submission.</p>
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
                      onChange={(event) => updateStatusField('applyId', event.target.value)}
                    />
                  </label>
                  <label className="form-group">
                    <span className="required">Email Address</span>
                    <input
                      type="email"
                      value={statusForm.email}
                      placeholder="your.email@example.com"
                      onChange={(event) => updateStatusField('email', event.target.value)}
                    />
                  </label>
                </div>

                <div className="status-check-actions">
                  <button type="submit" className="btn btn-primary" disabled={statusLoading}>
                    <span>{statusLoading ? 'Checking Status...' : 'Check Status'}</span>
                    {!statusLoading ? <Icon className="btn-icon" name="arrowRight" /> : <span className="spinner" aria-hidden="true" />}
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
