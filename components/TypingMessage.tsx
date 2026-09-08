'use client';

import React, { useEffect, useRef } from 'react';
import { useTypingMessages } from '@/hooks/useTypingMessages';
import { TypingMessage as TypingMessageType, MessageSegment } from '@/data/typingMessages';

// Easing function for fade transitions
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Pre-calculate timing events for each character with variance
interface TimingEvent {
  char: string;
  time: number;
  bold?: boolean;
  italic?: boolean;
}

function calculateTimingEvents(segments: MessageSegment[]): TimingEvent[] {
  const events: TimingEvent[] = [];
  let currentTime = 0;

  for (const segment of segments) {
    if (segment.type === 'pause') {
      currentTime += segment.duration;
    } else {
      const msPerChar = segment.msPerChar ?? 80;
      for (const char of segment.content) {
        // Add +/- 30% random variance for human feel
        const variance = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        const charTime = msPerChar * variance;
        events.push({
          char,
          time: currentTime,
          bold: segment.bold,
          italic: segment.italic,
        });
        currentTime += charTime;
      }
    }
  }

  return events;
}

// Build styled HTML from timing events
function buildStyledText(events: TimingEvent[], upToIndex: number): string {
  if (upToIndex < 0) return '';

  let html = '';
  let currentBold = false;
  let currentItalic = false;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      const text = buffer
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (currentBold || currentItalic) {
        const styles: string[] = [];
        if (currentBold) styles.push('font-weight:700');
        if (currentItalic) styles.push('font-style:italic');
        html += `<span style="${styles.join(';')}">${text}</span>`;
      } else {
        html += text;
      }
      buffer = '';
    }
  };

  for (let i = 0; i <= upToIndex && i < events.length; i++) {
    const event = events[i];
    const bold = event.bold ?? false;
    const italic = event.italic ?? false;

    if (bold !== currentBold || italic !== currentItalic) {
      flushBuffer();
      currentBold = bold;
      currentItalic = italic;
    }
    buffer += event.char;
  }
  flushBuffer();

  return html;
}

export default function TypingMessage(): React.ReactElement {
  const { isReady, hasMessages, getNextMessage } = useTypingMessages();
  const textRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<{
    message: TypingMessageType | null;
    events: TimingEvent[];
    phase: 'typing' | 'displaying' | 'fading';
    phaseStartTime: number;
    totalTypingTime: number;
    lastCharIndex: number;
  }>({
    message: null,
    events: [],
    phase: 'typing',
    phaseStartTime: 0,
    totalTypingTime: 0,
    lastCharIndex: -1,
  });

  useEffect(() => {
    if (!isReady || !hasMessages) return;

    const FADE_DURATION = 400;

    const loadNextMessage = () => {
      const message = getNextMessage();
      if (!message) return;

      const events = calculateTimingEvents(message.segments);
      const totalTypingTime = events.length > 0 ? events[events.length - 1].time + 50 : 0;

      stateRef.current = {
        message,
        events,
        phase: 'typing',
        phaseStartTime: performance.now(),
        totalTypingTime,
        lastCharIndex: -1,
      };

      if (textRef.current) {
        textRef.current.innerHTML = '';
      }
    };

    // Load first message
    loadNextMessage();

    const animate = (timestamp: number) => {
      const state = stateRef.current;
      if (!state.message || !textRef.current) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const phaseElapsed = timestamp - state.phaseStartTime;
      const displayDuration = state.message.displayDuration ?? 3000;

      if (state.phase === 'typing') {
        // Fade in during typing
        const fadeProgress = Math.min(phaseElapsed / FADE_DURATION, 1);
        textRef.current.style.opacity = String(easeInOutSine(fadeProgress));

        // Find how many characters should be visible
        let charIndex = -1;
        for (let i = 0; i < state.events.length; i++) {
          if (phaseElapsed >= state.events[i].time) {
            charIndex = i;
          } else {
            break;
          }
        }

        // Update text only if changed
        if (charIndex !== state.lastCharIndex) {
          textRef.current.innerHTML = buildStyledText(state.events, charIndex);
          state.lastCharIndex = charIndex;
        }

        // Check if typing is complete
        if (phaseElapsed >= state.totalTypingTime) {
          state.phase = 'displaying';
          state.phaseStartTime = timestamp;
        }
      } else if (state.phase === 'displaying') {
        // Hold at full opacity
        textRef.current.style.opacity = '1';

        if (phaseElapsed >= displayDuration) {
          state.phase = 'fading';
          state.phaseStartTime = timestamp;
        }
      } else if (state.phase === 'fading') {
        const fadeProgress = Math.min(phaseElapsed / FADE_DURATION, 1);
        textRef.current.style.opacity = String(1 - easeInOutSine(fadeProgress));

        if (fadeProgress >= 1) {
          // Load next message immediately
          loadNextMessage();
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    // Start after a brief delay
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isReady, hasMessages, getNextMessage]);

  if (!isReady || !hasMessages) {
    return <span style={{ height: '3em', display: 'block' }} />;
  }

  return (
    <span
      style={{
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        color: '#626847',
        fontSize: 'clamp(1rem, 3vw, 1.5rem)',
        height: '3em',
        lineHeight: 1.4,
        display: 'block',
        overflow: 'hidden',
      }}
    >
      <span ref={textRef} style={{ opacity: 0 }} />
    </span>
  );
}
