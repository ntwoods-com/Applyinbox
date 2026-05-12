export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.NTW_CAREERS_CONFIG?.API_BASE ||
  'https://ntwoods.onrender.com/api';

export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ||
  window.NTW_CAREERS_CONFIG?.TURNSTILE_SITE_KEY ||
  '0x4AAAAAACVpKor7RIjOUDfl';
