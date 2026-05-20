import {
  mapPublicApplyError,
  retryHintText,
  validateScreeningAnswers,
} from './publicApplyUi.js';

describe('publicApplyUi helpers', () => {
  it('maps rate-limited responses into a clean retry hint', () => {
    expect(
      mapPublicApplyError({
        status: 429,
        payload: { error_code: 'RATE_LIMITED', retry_after_seconds: 90 },
      })
    ).toContain('Please try again in about 2 minutes');
  });

  it('maps safe backend error codes without leaking internals', () => {
    expect(mapPublicApplyError({ payload: { error_code: 'TURNSTILE_FAILED' } })).toBe(
      'Please complete the verification check and try again.'
    );
    expect(mapPublicApplyError({ payload: { error_code: 'JOB_UNAVAILABLE' } })).toContain(
      'selected job is no longer available'
    );
    expect(mapPublicApplyError({ payload: { error_code: 'NETWORK_OR_SERVER_ERROR' } })).toBe(
      'We could not complete the request right now. Please try again shortly.'
    );
  });

  it('validates only required screening questions', () => {
    const errors = validateScreeningAnswers(
      [
        { id: 'notice', question: 'Notice period', required: true },
        { id: 'optional', question: 'Anything else', required: false },
      ],
      { optional: 'N/A' }
    );

    expect(errors).toEqual({ notice: 'This question is required.' });
  });

  it('formats retry hint text conservatively', () => {
    expect(retryHintText(15)).toBe('Please try again in about 15 seconds.');
    expect(retryHintText(3601)).toBe('Please try again in about 2 hours.');
  });
});
