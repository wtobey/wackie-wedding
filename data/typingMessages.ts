export interface TextSegment {
  type: 'text';
  content: string;
  msPerChar?: number; // Default: 80ms
  bold?: boolean;     // Render in bold
  italic?: boolean;   // Render in italic (note: base style is already italic)
}

export interface PauseSegment {
  type: 'pause';
  duration: number; // milliseconds
}

export type MessageSegment = TextSegment | PauseSegment;

export interface TypingMessage {
  id: string;
  segments: MessageSegment[];
  displayDuration?: number;  // How long to hold after typing (default: 3000ms)
  fadeOutDuration?: number;  // Fade out time (default: 500ms)
}

// Sample messages for initial testing
export const staticTypingMessages: TypingMessage[] = [
  {
    id: 'coming-soon-1',
    segments: [
      { type: 'text', content: 'to a ' },
      { type: 'pause', duration: 800 },
      { type: 'text', content: '... something, near you.', msPerChar: 100 },
    ],
    displayDuration: 4000,
  },
  {
    id: 'coming-soon-3',
    segments: [
      { type: 'text', content: 'Save the date ' },
      { type: 'pause', duration: 400 },
      { type: 'text', content: '... but we\'re not sure which one yet.' },
    ],
    displayDuration: 3500,
  },
  {
    id: 'coming-soon-4',
    segments: [
      { type: 'text', content: 'Are you ready to get ' },
      { type: 'pause', duration: 200 },
      { type: 'text', content: 'WACKIE', bold: true },
      { type: 'text', content: '?!' }
    ],
    displayDuration: 3500,
  },
  {
    id: 'coming-soon-5',
    segments: [
      { type: 'text', content: 'Will + Jackie = ' },
      { type: 'pause', duration: 2000 },
      { type: 'text', content: 'WACKIE', bold: true },
    ],
    displayDuration: 3500,
  },
  {
    id: 'coming-soon-5',
    segments: [
      { type: 'text', content: 'Your having access to this site means' },
      { type: 'text', content: ' nothing ', italic: true },
      { type: 'text', content: 'about your invite status.' }
    ],
    displayDuration: 3500,
  },
];
