import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, TURNSTILE_SITE_KEY } from './config.js';

const DRAFT_KEY = 'ntw_careers_apply_draft_v1';
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

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
  ['Can I apply for other positions?', 'Yes. Select “Other” if your exact role is not available, and the HR team can review your profile accordingly.'],
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
  return (value || '').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 40);
}

function getSourceText() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeSource(params.get('source') || params.get('utm_source') || params.get('ref'));
}

function validateValue(field, rawValue) {
  const value = String(rawValue || '').trim();

  if (field === 'name') {
    return value.length >= 2 && /^[A-Za-zÀ-ž.'\-\s]{2,100}$/.test(value);
  }

  if (field === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  if (field === 'mobile') {
    return !value || /^[6-9][0-9]{9}$/.test(value);
  }

  return true;
}

function fieldIcon(validity, value) {
  if (validity === undefined || !String(value || '').trim()) return null;
  return validity ? '✓' : '✕';
}

function fieldClass(validity, value) {
  if (validity === undefined && !String(value || '').trim()) return '';
  if (validity === true) return 'valid';
  if (validity === false) return 'invalid';
  return '';
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

  const fileInputRef = useRef(null);
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const alertRef = useRef(null);
  const hpRef = useRef(null);
  const sessionTokenRef = useRef(generateToken());
  const formLoadTimeRef = useRef(Date.now());
  const sourceText = useMemo(getSourceText, []);

  useEffect(() => {
    let cancelled = false;
    let checks = 0;

    const renderTurnstile = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile || turnstileWidgetIdRef.current) return;

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
            showError('Verification expired. Please complete verification again.');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('error');
            showError('Verification could not be completed. Please check that this domain is allowed in Cloudflare Turnstile and try again.');
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
      if (form[key]) draft[key] = form[key];
    });
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Browser storage may be unavailable. Form still works.
    }
  }, [form.name, form.email, form.mobile, form.position, form.experience, form.location]);

  function showError(message) {
    setAlert({ type: 'error', message });
    window.requestAnimationFrame(() => {
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function updateField(field, value) {
    const nextValue = field === 'mobile' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));

    if (validation[field] !== undefined) {
      setValidation((current) => ({
        ...current,
        [field]: validateValue(field, nextValue),
      }));
    }
  }

  function validateField(field) {
    const valid = validateValue(field, form[field]);
    setValidation((current) => ({ ...current, [field]: valid }));
    return valid;
  }

  function checkFile(file) {
    if (!file) {
      return { ok: false, message: 'Please select your CV/Resume.' };
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, message: 'File too large. Maximum allowed size is 2MB.' };
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { ok: false, message: 'Invalid file type. Please upload PDF, DOC, or DOCX only.' };
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
    } else {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showError(result.message);
    }
  }

  function resetFileInput() {
    setSelectedFile(null);
    setFileError('');
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    if (hpRef.current?.value) {
      return { ok: false, silent: true, message: 'Submission blocked.' };
    }

    if (Date.now() - formLoadTimeRef.current < 3000) {
      return { ok: false, message: 'Please take a moment to review the form before submitting.' };
    }

    if (!turnstileToken) {
      return { ok: false, message: 'Please complete the verification box before submitting. If the verification box is not loading, add your GitHub Pages domain in Cloudflare Turnstile allowed domains.' };
    }

    if (!nameValid || !emailValid || !mobileValid) {
      return { ok: false, message: 'Please fix the highlighted fields.' };
    }

    if (!form.position) {
      return { ok: false, message: 'Please select the position you are applying for.', positionError: true };
    }

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.ok) {
      return { ok: false, message: fileValidation.message || 'Please select a valid CV file.' };
    }

    if (!form.consent) {
      return { ok: false, message: 'Please confirm the recruitment consent before submitting.' };
    }

    return { ok: true };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAlert(null);

    const validationResult = validateFormBeforeSubmit();
    if (!validationResult.ok) {
      if (validationResult.positionError) setValidation((current) => ({ ...current, position: false }));
      if (!validationResult.silent) showError(validationResult.message);
      return;
    }

    try {
      setIsSubmitting(true);
      setButtonText('Creating application...');

      const positionTitle = positions.find(([code]) => code === form.position)?.[1] || '';

      const initRes = await fetch(`${API_BASE}/v1/apply/init`, {
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
        throw new Error('Network error while creating application. Please try again.');
      }

      const initData = await initRes.json();
      if (!initData.success) {
        throw new Error(initData.error || 'Failed to submit application.');
      }

      const applyId = initData.apply_id;
      setButtonText('Uploading CV...');

      const uploadFormData = new FormData();
      uploadFormData.append('apply_id', applyId);
      uploadFormData.append('cv', selectedFile);
      uploadFormData.append('experience', form.experience);
      uploadFormData.append('location', form.location.trim());

      const uploadRes = await fetch(`${API_BASE}/v1/apply/upload-cv`, {
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
        throw new Error('Failed to upload CV. Please try again.');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload CV.');
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setSuccessApplyId(applyId || '');
      setSubmitted(true);
    } catch (error) {
      resetTurnstile();
      showError(error.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
      setButtonText('Submit Application');
    }
  }

  const fileSizeKb = selectedFile ? (selectedFile.size < 1024 ? '< 1' : (selectedFile.size / 1024).toFixed(1)) : null;
  const submitDisabled = isSubmitting;
  const positionInvalid = validation.position === false && !form.position;

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

          <a className="nav-cta" href="#application">Apply Now <span aria-hidden="true">→</span></a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="page-shell hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"></span> Hiring across business operations</span>
              <h1 id="hero-title">Build your career with <span className="hero-gradient-text">NT Woods</span></h1>
              <p className="hero-lead">
                Submit your profile for available roles in Accounts, HR, Sales, Marketing, Admin and IT support. Our HR team will review your application and connect with shortlisted candidates.
              </p>

              <div className="hero-actions">
                <a className="btn-link-primary" href="#application">Start Application <span aria-hidden="true">→</span></a>
                <a className="btn-link-secondary" href="#process">View Process</a>
              </div>

              <div className="trust-strip" aria-label="Application highlights">
                <div className="trust-item"><strong>Protected Form</strong><span>Turnstile verification and bot checks are enabled.</span></div>
                <div className="trust-item"><strong>HR Review</strong><span>Applications are reviewed by the internal HR team.</span></div>
                <div className="trust-item"><strong>Fast Apply</strong><span>Keep your CV ready and complete the form in minutes.</span></div>
              </div>

              <div className="info-panel" id="roles">
                <div className="info-panel-title">
                  <h2>Open role categories</h2>
                  {sourceText ? <span className="source-pill show">Source: {sourceText}</span> : <span className="source-pill" />}
                </div>
                <div className="role-grid">
                  {roleCards.map(([title, description]) => (
                    <div className="role-card" key={title}><b>{title}</b><small>{description}</small></div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="application-shell" id="application" aria-label="Application form">
              <div className="application-card">
                {alert && (
                  <div ref={alertRef} className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`} role="alert" aria-live="polite">
                    <span className="alert-icon" aria-hidden="true">{alert.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{alert.message}</span>
                  </div>
                )}

                {!submitted ? (
                  <div id="form-section">
                    <div className="form-header">
                      <div className="form-header-top">
                        <div className="form-icon" aria-hidden="true">💼</div>
                        <span className="form-tag">2-step protected submission</span>
                      </div>
                      <h2>Submit your application</h2>
                      <p className="subtitle">Fill in your basic details and upload your CV. Fields marked with <strong>*</strong> are required.</p>
                      <div className="security-row" aria-label="Security notes">
                        <span className="security-badge">🔒 Protected Application Submission</span>
                        <span className="security-badge secondary">✓ Verification Enabled</span>
                      </div>
                    </div>

                    <form id="apply-form" noValidate onSubmit={handleSubmit}>
                      <div className="hp-field" aria-hidden="true">
                        <label htmlFor="_hp_check">Leave this empty</label>
                        <input ref={hpRef} type="text" id="_hp_check" name="_hp_check" tabIndex="-1" autoComplete="off" />
                      </div>
                      <input type="hidden" id="_timestamp" name="_timestamp" value={formLoadTimeRef.current} readOnly />
                      <input type="hidden" id="_token" name="_token" value={sessionTokenRef.current} readOnly />

                      <div className="form-section-title">Personal details</div>

                      <div className="form-group">
                        <label className="required" htmlFor="name"><span className="label-icon" aria-hidden="true">👤</span>Full Name</label>
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
                            onChange={(e) => updateField('name', e.target.value)}
                            onBlur={() => validateField('name')}
                          />
                          <span className={`input-icon ${fieldIcon(validation.name, form.name) ? 'show' : ''} ${validation.name ? 'valid' : validation.name === false ? 'invalid' : ''}`} aria-hidden="true">
                            {fieldIcon(validation.name, form.name)}
                          </span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="required" htmlFor="email"><span className="label-icon" aria-hidden="true">✉️</span>Email Address</label>
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
                            onChange={(e) => updateField('email', e.target.value)}
                            onBlur={() => validateField('email')}
                          />
                          <span className={`input-icon ${fieldIcon(validation.email, form.email) ? 'show' : ''} ${validation.email ? 'valid' : validation.email === false ? 'invalid' : ''}`} aria-hidden="true">
                            {fieldIcon(validation.email, form.email)}
                          </span>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="mobile"><span className="label-icon" aria-hidden="true">📱</span>Mobile Number <span className="field-hint">(Optional)</span></label>
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
                              onChange={(e) => updateField('mobile', e.target.value)}
                              onBlur={() => validateField('mobile')}
                            />
                            <span className={`input-icon ${fieldIcon(validation.mobile, form.mobile) ? 'show' : ''} ${validation.mobile ? 'valid' : validation.mobile === false ? 'invalid' : ''}`} aria-hidden="true">
                              {fieldIcon(validation.mobile, form.mobile)}
                            </span>
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="location"><span className="label-icon" aria-hidden="true">📍</span>Current Location</label>
                          <input
                            type="text"
                            id="location"
                            placeholder="City, State"
                            maxLength="100"
                            autoComplete="address-level2"
                            value={form.location}
                            onChange={(e) => updateField('location', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-section-title">Role preference</div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="required" htmlFor="position"><span className="label-icon" aria-hidden="true">💼</span>Position Applying For</label>
                          <select
                            className={positionInvalid ? 'invalid' : ''}
                            id="position"
                            autoComplete="organization-title"
                            required
                            value={form.position}
                            onChange={(e) => {
                              updateField('position', e.target.value);
                              setValidation((current) => ({ ...current, position: undefined }));
                            }}
                          >
                            {positions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="experience"><span className="label-icon" aria-hidden="true">⏱️</span>Experience</label>
                          <select id="experience" value={form.experience} onChange={(e) => updateField('experience', e.target.value)}>
                            {experienceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="form-section-title">Resume upload</div>

                      <div className="form-group file-input">
                        <label className="required" htmlFor="cv"><span className="label-icon" aria-hidden="true">📄</span>Resume / CV</label>
                        <div
                          className={`file-dropzone ${dragging ? 'dragging' : ''}`}
                          onDragEnter={(e) => { preventDefaults(e); setDragging(true); }}
                          onDragOver={(e) => { preventDefaults(e); setDragging(true); }}
                          onDragLeave={(e) => { preventDefaults(e); setDragging(false); }}
                          onDrop={(e) => {
                            preventDefaults(e);
                            setDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleFile(file);
                          }}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            id="cv"
                            accept=".pdf,.doc,.docx"
                            required
                            aria-describedby="file-help"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                          />
                          <div
                            className={`file-label ${selectedFile ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
                            role="button"
                            tabIndex="0"
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                fileInputRef.current?.click();
                              }
                            }}
                          >
                            <div className="file-icon" aria-hidden="true">📄</div>
                            <div className="file-text">
                              <div className="main" id="file-name">{selectedFile ? selectedFile.name : 'Choose your CV or drag & drop'}</div>
                              <div className="sub" id="file-help">
                                {selectedFile ? <><span className="file-size">{fileSizeKb} KB</span> · Ready to upload</> : 'PDF, DOC, DOCX accepted · maximum 2MB'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`remove-file ${selectedFile ? '' : 'hidden'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                resetFileInput();
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {fileError ? <div className="field-error-note">{fileError}</div> : null}
                      </div>

                      <div className="consent-card">
                        <input
                          type="checkbox"
                          id="consent"
                          required
                          checked={form.consent}
                          onChange={(e) => {
                            setForm((current) => ({ ...current, consent: e.target.checked }));
                            setAlert(null);
                          }}
                        />
                        <label htmlFor="consent">I confirm that the information provided is correct and may be used by NT Woods for recruitment communication and application review.</label>
                      </div>

                      <div className="turnstile-container" aria-label="Verification">
                        <div ref={turnstileRef} className="turnstile-widget" />
                        <p className={`verification-note verification-${turnstileStatus}`}>
                          {turnstileStatus === 'verified'
                            ? 'Verification completed. You can submit the application now.'
                            : turnstileStatus === 'error'
                              ? 'Verification is not loading. Please check Turnstile domain settings or refresh the page.'
                              : turnstileStatus === 'expired'
                                ? 'Verification expired. Please verify again before submitting.'
                                : 'Complete verification before submitting. The submit button will show a clear message if verification is pending.'}
                        </p>
                      </div>

                      <button type="submit" className="btn btn-primary" id="btn-submit" disabled={submitDisabled}>
                        <span id="btn-text">{buttonText}</span>
                        {!isSubmitting && <span className="btn-icon" aria-hidden="true">→</span>}
                        {isSubmitting && <span className="spinner" aria-hidden="true" />}
                      </button>

                      <p className="form-footnote">Your CV and contact details should only be submitted once for the same role. Verification must be completed before submission.</p>
                    </form>
                  </div>
                ) : (
                  <div id="success" className="success-screen" aria-live="polite">
                    <div className="success-icon" aria-hidden="true">✓</div>
                    <div className="success-message">
                      <h2>Application submitted successfully</h2>
                      <p>Thank you for applying. Our HR team will review your application and connect with you if your profile matches the requirement.</p>
                      {successApplyId ? <div className="application-id-box">Application ID: <span>{successApplyId}</span></div> : null}
                      <div className="success-details">
                        <p><strong>What happens next?</strong></p>
                        <p>• Your application will be reviewed by the HR team.</p>
                        <p>• Shortlisted candidates will be contacted for the next stage.</p>
                        <p>• Please keep your phone and email available for updates.</p>
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
              <p>Keep your CV updated and ensure your email/mobile number is correct before submitting the form.</p>
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
          <div><strong>NT Woods Careers</strong> · Recruitment application portal</div>
          <p>Candidate information is used only for hiring and recruitment review purposes.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
