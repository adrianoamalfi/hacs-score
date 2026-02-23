export type TrackPayload = Record<string, string | number | boolean>;
type TrackFn = (eventName: string, payload?: TrackPayload) => void;

type AnalyticsOptions = {
  enabled: boolean;
  scriptUrl: string;
  websiteId: string;
};

const DEFAULT_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const CLICK_BOUND_ATTR = 'data-hacs-analytics-bound';
const UMAMI_EVENT_ATTR = '[data-umami-event]';

declare global {
  interface Window {
    __hacsTrack?: TrackFn;
    __hacsAnalyticsInitialized?: boolean;
    umami?: {
      track: (eventName: string, payload?: TrackPayload) => void;
    };
  }
}

function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const value = String(navigator.doNotTrack || (window as { doNotTrack?: string }).doNotTrack || '').toLowerCase();
  return value === '1' || value === 'yes';
}

function getPayload(element: HTMLElement): TrackPayload {
  const payload: TrackPayload = {};
  const map: Record<string, string> = {
    umamiSlug: 'slug',
    umamiCategory: 'category',
    umamiLocation: 'location',
    umamiType: 'type',
    umamiLabel: 'label',
    umamiValue: 'value',
    umamiPreset: 'preset'
  };

  for (const [sourceKey, targetKey] of Object.entries(map)) {
    const value = element.dataset[sourceKey];
    if (value) {
      payload[targetKey] = value;
    }
  }

  return payload;
}

function trackWithUmami(eventName: string, payload: TrackPayload = {}): void {
  if (!eventName || isDoNotTrackEnabled()) return;

  const umami = window.umami;
  if (!umami || typeof umami.track !== 'function') return;

  try {
    if (Object.keys(payload).length > 0) {
      umami.track(eventName, payload);
      return;
    }
    umami.track(eventName);
  } catch {
    // Ignore analytics runtime failures to avoid breaking UX.
  }
}

function ensureTracker(): void {
  if (typeof window.__hacsTrack !== 'function') {
    window.__hacsTrack = () => {};
  }
}

function bindClickTracking(): void {
  if (document.body.hasAttribute(CLICK_BOUND_ATTR)) return;
  document.body.setAttribute(CLICK_BOUND_ATTR, '1');

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const explicit = target.closest(UMAMI_EVENT_ATTR);
    if (explicit instanceof HTMLElement) {
      const eventName = explicit.dataset.umamiEvent;
      if (eventName) {
        trackWithUmami(eventName, getPayload(explicit));
      }
    }

    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;

    try {
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) {
        trackWithUmami('outbound_click', {
          destination_host: destination.host,
          destination_path: destination.pathname
        });
      }
    } catch {
      // Ignore invalid URLs in anchors.
    }
  });
}

function ensureUmamiScript(scriptUrl: string, websiteId: string): void {
  const existing = document.querySelector<HTMLScriptElement>('script[data-website-id]');
  if (existing) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = scriptUrl || DEFAULT_SCRIPT_URL;
  script.dataset.websiteId = websiteId;
  document.head.append(script);
}

export function trackEvent(eventName: string, payload: TrackPayload = {}): void {
  ensureTracker();
  window.__hacsTrack?.(eventName, payload);
}

export function initAnalytics(options: AnalyticsOptions): void {
  if (typeof window === 'undefined') return;
  if (window.__hacsAnalyticsInitialized) return;

  ensureTracker();
  window.__hacsTrack = () => {};

  if (!options.enabled || !options.websiteId || isDoNotTrackEnabled()) {
    window.__hacsAnalyticsInitialized = true;
    return;
  }

  ensureUmamiScript(options.scriptUrl, options.websiteId);
  window.__hacsTrack = (eventName: string, payload: TrackPayload = {}) => trackWithUmami(eventName, payload);
  bindClickTracking();
  window.__hacsAnalyticsInitialized = true;
}
