import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from './App.jsx';

vi.mock('./config.js', () => ({
  API_BASE: '/api',
  TURNSTILE_SITE_KEY: 'test-turnstile-site-key',
}));

function jsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

function buildFetchMock({
  jobs,
  config = { whatsapp_enabled: false, whatsapp_number: '' },
  init = { success: true, apply_id: 'PA-2026-TEST' },
  upload = { success: true },
} = {}) {
  return vi.fn(async (url, options = {}) => {
    const method = String(options?.method || 'GET').toUpperCase();
    const path = String(url || '');

    if (path.endsWith('/v1/apply/jobs')) {
      if (jobs instanceof Error) {
        throw jobs;
      }
      return jsonResponse({ items: Array.isArray(jobs) ? jobs : [] });
    }

    if (path.endsWith('/v1/apply/config')) {
      return jsonResponse(config);
    }

    if (path.endsWith('/v1/apply/init') && method === 'POST') {
      return jsonResponse(init, init?.status || 200);
    }

    if (path.endsWith('/v1/apply/upload-cv') && method === 'POST') {
      return jsonResponse(upload, upload?.status || 200);
    }

    if (path.endsWith('/v1/apply/status') && method === 'POST') {
      return jsonResponse({ success: true, apply_id: 'PA-2026-STATUS', status_label: 'Pending Review', position_title: 'Operations Executive' });
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  });
}

function selectFile(input, file) {
  fireEvent.change(input, { target: { files: [file] } });
}

function getApplicationEmailInput() {
  return screen.getAllByLabelText(/Email Address/i)[0];
}

async function openApplicationPage() {
  const startLink = screen.queryByRole('link', { name: /Start Application/i });
  if (startLink) {
    fireEvent.click(startLink);
  }
  await screen.findByRole('heading', { name: 'Submit your application' });
}

async function completeContactStep() {
  await openApplicationPage();
  fireEvent.change(await screen.findByLabelText(/Full Name/i), { target: { value: 'Rahul Sharma' } });
  fireEvent.change(getApplicationEmailInput(), { target: { value: 'rahul@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));
}

describe('Applyinbox candidate journey', () => {
  let nowValue = 0;

  beforeEach(() => {
    nowValue = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => nowValue);
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:resume-preview'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { randomUUID: () => 'uuid-applyinbox-test' },
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback) => window.setTimeout(callback, 0),
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    window.turnstile = {
      render: vi.fn((_node, options) => {
        window.setTimeout(() => {
          options?.callback?.('verified-turnstile-token');
        }, 0);
        return 'widget-id';
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    };
    sessionStorage.clear();
    window.history.replaceState(null, '', '#top');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.turnstile;
    delete global.fetch;
  });

  it('falls back to curated role options when live jobs are unavailable', async () => {
    global.fetch = buildFetchMock({
      jobs: new TypeError('network unavailable'),
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Role and screening/i }));
    const positionSelect = await screen.findByLabelText(/Position Applying For/i);
    expect(positionSelect).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Accountant' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Other' })).toBeTruthy();
  });

  it('moves to the next step page after the contact step is completed', async () => {
    global.fetch = buildFetchMock({
      jobs: [],
    });

    render(<App />);

    expect(screen.queryByRole('heading', { name: 'Submit your application' })).toBeNull();
    await completeContactStep();

    expect(await screen.findByRole('heading', { name: 'Role preference' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Personal details' })).toBeNull();
  });

  it('renders Turnstile only after the verification step is opened', async () => {
    global.fetch = buildFetchMock({
      jobs: [],
    });

    render(<App />);

    expect(window.turnstile.render).not.toHaveBeenCalled();

    await completeContactStep();
    fireEvent.change(screen.getByLabelText(/Position Applying For/i), { target: { value: 'ACC-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to resume upload/i }));
    selectFile(screen.getByLabelText(/Resume \/ CV/i), new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }));
    expect(window.turnstile.render).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Continue to verification/i }));

    await waitFor(() => {
      expect(window.turnstile.render).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: 'Consent and verification' })).toBeTruthy();
  });

  it('opens job details and Apply Now selects the matching live role', async () => {
    global.fetch = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          opening_count: 2,
          job_description: 'Coordinate daily operations.',
          screening_questions: [{ id: 'notice_period', question: 'Notice period?', type: 'text', required: true }],
        },
      ],
    });

    render(<App />);

    await screen.findAllByText('Operations Executive');
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    const dialog = screen.getByRole('dialog', { name: 'Operations Executive' });
    expect(dialog).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Now' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Position Applying For/i).value).toBe('OPS-001');
    });
    expect(screen.getByRole('heading', { name: 'Role preference' })).toBeTruthy();
  });

  it('mirrors live approved roles in the browse-side highlights panel', async () => {
    global.fetch = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          opening_count: 2,
          location: 'Indore',
          job_description: 'Coordinate daily operations and support branch workflows.',
        },
      ],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Live role highlights' })).toBeTruthy();
    expect(screen.getAllByText('Operations Executive').length).toBeGreaterThan(1);
    expect(screen.getByText(/same approved roles from the live feed are previewed here/i)).toBeTruthy();
  });

  it('shows proper selected-role details when a live role card is clicked', async () => {
    global.fetch = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          opening_count: 2,
          location: 'Indore',
          job_description: 'Coordinate daily operations and support branch workflows.',
          screening_questions: [{ id: 'notice_period', question: 'Notice period?', type: 'text', required: true }],
        },
        {
          job_public_code: 'QA-002',
          position_title: 'Quality Analyst',
          opening_count: 1,
          location: 'Bhopal',
          job_description: 'Review production output and maintain quality documentation.',
          skills: 'Quality checks, reporting',
          screening_questions: [{ id: 'shift_ready', question: 'Can you work shifts?', type: 'yes_no', required: true }],
        },
      ],
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Live role highlights' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Operations Executive', level: 4 })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Quality Analyst/i }));

    const detailPanel = screen.getByLabelText('Selected role details');
    expect(await within(detailPanel).findByRole('heading', { name: 'Quality Analyst', level: 4 })).toBeTruthy();
    expect(within(detailPanel).getByText(/Review production output and maintain quality documentation/i)).toBeTruthy();
    expect(within(detailPanel).getByText(/Can you work shifts/i)).toBeTruthy();
  });

  it('resets stale screening answers when the selected live role changes', async () => {
    global.fetch = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          screening_questions: [{ id: 'notice_period', question: 'Notice period?', type: 'text', required: true }],
        },
        {
          job_public_code: 'QA-002',
          position_title: 'Quality Analyst',
          screening_questions: [{ id: 'weekend_shift', question: 'Can you work weekend shifts?', type: 'yes_no', required: true }],
        },
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Role and screening/i }));
    const positionSelect = await screen.findByLabelText(/Position Applying For/i);
    fireEvent.change(positionSelect, { target: { value: 'OPS-001' } });
    const firstQuestion = await screen.findByLabelText('Notice period?');
    fireEvent.change(firstQuestion, { target: { value: 'Immediate' } });
    expect(firstQuestion.value).toBe('Immediate');

    fireEvent.change(positionSelect, { target: { value: 'QA-002' } });

    await waitFor(() => {
      expect(screen.queryByLabelText('Notice period?')).toBeNull();
    });
    expect(screen.getByLabelText('Yes')).toBeTruthy();
  });

  it('blocks submit when a required screening answer is missing for a live job', async () => {
    global.fetch = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          screening_questions: [{ id: 'notice_period', question: 'Notice period?', type: 'text', required: true }],
        },
      ],
    });

    render(<App />);
    nowValue = 5000;

    await completeContactStep();
    fireEvent.change(screen.getByLabelText(/Position Applying For/i), { target: { value: 'OPS-001' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to resume upload/i }));

    expect(await screen.findByText('Please answer the required screening questions.')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('submits the full live-job application flow and persists screening answers to init', async () => {
    const fetchMock = buildFetchMock({
      jobs: [
        {
          job_public_code: 'OPS-001',
          position_title: 'Operations Executive',
          requirement_id: 'REQ-001',
          screening_questions: [{ id: 'notice_period', question: 'Notice period?', type: 'text', required: true }],
        },
      ],
    });
    global.fetch = fetchMock;

    render(<App />);
    nowValue = 5000;

    await completeContactStep();
    fireEvent.change(screen.getByLabelText(/Position Applying For/i), { target: { value: 'OPS-001' } });
    fireEvent.change(screen.getByLabelText('Notice period?'), { target: { value: 'Immediate' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to resume upload/i }));
    selectFile(screen.getByLabelText(/Resume \/ CV/i), new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue to verification/i }));
    await screen.findByRole('heading', { name: 'Consent and verification' });
    await waitFor(() => {
      expect(window.turnstile.render).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByLabelText(/I confirm that the information provided is correct/i));
    const submitButton = screen.getByRole('button', { name: /Submit Application/i });
    await waitFor(() => {
      expect(submitButton.disabled).toBe(false);
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/v1/apply/init'))).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/v1/apply/upload-cv'))).toBe(true);
    });
    expect(await screen.findByRole('heading', { name: 'Application submitted successfully' })).toBeTruthy();

    const initCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v1/apply/init'));
    expect(initCall).toBeTruthy();
    const initPayload = JSON.parse(initCall[1].body);
    expect(initPayload.screening_answers).toEqual({ notice_period: 'Immediate' });

    const uploadCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v1/apply/upload-cv'));
    expect(uploadCall).toBeTruthy();
  });
});
