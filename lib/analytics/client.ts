'use client';

import type { PostHog } from 'posthog-js';
import { analyticsAllowed, analyticsPath, cleanAnalyticsUrl } from './routes';

type WeddingEvent = 'guest_access_granted' | 'rsvp_opened' | 'registry_clicked' |
  'directions_clicked' | 'photo_opened' | 'gallery_view_changed';
let client: Promise<PostHog | null> | undefined;
let currentScreen: string | null = null;

function enabled() {
  return typeof window !== 'undefined' &&
    analyticsAllowed(process.env.NEXT_PUBLIC_VERCEL_ENV, window.location.hostname) &&
    analyticsPath(window.location.pathname, true) !== null &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
}

function getClient() {
  if (!enabled()) return Promise.resolve(null);
  client ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      capture_performance: false,
      person_profiles: 'never',
      persistence: 'localStorage',
      before_send: event => {
        if (!event || !enabled()) return null;
        // Keep query strings, fragments, and automatic initial URL properties out.
        for (const [key, value] of Object.entries(event.properties)) {
          if (typeof value === 'string' && /^https?:\/\//.test(value)) {
            event.properties[key] = cleanAnalyticsUrl(value);
          }
        }
        return event;
      },
    });
    return posthog;
  }).catch(() => { client = undefined; return null; });
  return client;
}

export function trackWeddingPage(path: string | null) {
  currentScreen = path;
  if (!path || !enabled()) return;
  void getClient().then(posthog => {
    if (currentScreen !== path || !enabled()) return;
    posthog?.capture('$pageview', { $current_url: window.location.origin + path, $pathname: path });
  });
}

export function trackWeddingEvent(event: WeddingEvent, view?: 'grid' | 'timeline') {
  if (!enabled()) return;
  const path = currentScreen || window.location.pathname;
  void getClient().then(posthog => {
    if (!enabled()) return;
    posthog?.capture(event, {
      $current_url: window.location.origin + path,
      $pathname: path,
      ...(view ? { view } : {}),
    });
  });
}
