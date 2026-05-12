import { useEffect, useRef, useState } from 'react';
import { API_BASE, TURNSTILE_SITE_KEY } from './config.js';

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

const positions = [
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

const POSITION_LABELS = Object.fromEntries(positions.filter(([value]) => value));
const VALID_POSITIONS = new Set(positions.map(([value]) => value).filter(Boolean));
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

function sanitizeSource(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 _.-]/g, '')
    .slice(0, 40);
}

function getSourceText() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeSource(params.get('source') || params.get('utm_source') || params.get('ref'));
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
    return VALID_POSITIONS.has(value);
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

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return '< 1 KB';
  return `${(bytes / 1024).toFixed(1)} KB`;
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

  const fileInputRef = useRef(null);
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const alertRef = useRef(null);
  const hpRef = useRef(null);
  const sourceTextRef = useRef(getSourceText());
  const sessionTokenRef = useRef(generateToken());
  const formLoadTimeRef = useRef(Date.now());
  const sourceText = sourceTextRef.current;

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

  function showError(message) {
    setAlert({ type: 'error', message });

    window.requestAnimationFrame(() => {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const valid = validateValue(field, overrideValue ?? form[field]);
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

      const positionTitle = POSITION_LABELS[form.position] || '';
      const initRes = await fetchWithTimeout(`${API_BASE}/v1/apply/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': sessionTokenRef.current,
          'X-Timestamp': String(formLoadTimeRef.current),
        },
        body: JSON.stringify({
          turnstile_token: turnstileToken,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile.trim(),
          job_public_code: form.position,
          position_title: positionTitle,
          _hp_check: hpRef.current?.value || '',
          _timestamp: formLoadTimeRef.current,
          _token: sessionTokenRef.current,
        }),
      });

      if (initRes.status === 429) {
        throw new Error('Too many attempts. Please try again in a few minutes.');
      }

      if (!initRes.ok) {
        throw new Error('Network error while creating the application. Please try again.');
      }

      const initData = await initRes.json();
      if (!initData.success || !initData.apply_id) {
        throw new Error(initData.error || 'Failed to submit the application.');
      }

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

      if (uploadRes.status === 429) {
        throw new Error('Too many upload attempts. Please try again later.');
      }

      if (!uploadRes.ok) {
        throw new Error('Failed to upload the CV. Please try again.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload the CV.');
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setSuccessApplyId(applyId);
      setSubmitted(true);
      setIsSubmitting(false);
    } catch (error) {
      resetTurnstile();
      setIsSubmitting(false);
      setButtonText('Submit Application');

      if (error?.name === 'AbortError') {
        showError('The request timed out. Please check your connection and try again.');
        return;
      }

      showError(error?.message || 'Something went wrong. Please try again.');
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
  const roleReady = validateValue('position', form.position) && Boolean(selectedFile) && !fileError;
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
                  {sourceText ? <span className="source-pill show">Source: {sourceText}</span> : <span className="source-pill" />}
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
              <div className="application-card">
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
                                position: validateValue('position', event.target.value),
                              }));
                            }}
                          >
                            {positions.map(([value, label]) => (
                              <option key={value || 'empty'} value={value}>{label}</option>
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
                                    <span className="file-meta-separator">Ready to upload</span>
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
