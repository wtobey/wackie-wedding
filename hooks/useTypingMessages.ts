import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TypingMessage, staticTypingMessages } from '@/data/typingMessages';

// Module-level state to persist across component re-renders
let allMessages: TypingMessage[] = [];
let currentIndex = 0;
let messagesLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadTypingMessages(): Promise<void> {
  if (messagesLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Try to load from database first
    if (supabase) {
      const { data, error } = await supabase
        .from('typing_messages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        allMessages = data.map(row => ({
          id: row.id,
          segments: row.segments,
          displayDuration: row.display_duration ?? undefined,
          fadeOutDuration: row.fade_out_duration ?? undefined,
        }));
        messagesLoaded = true;
        return;
      }
    }

    // Fall back to static messages
    allMessages = [...staticTypingMessages];
    messagesLoaded = true;
  })();

  return loadPromise;
}

function getNextMessage(): TypingMessage | null {
  if (allMessages.length === 0) return null;

  const message = allMessages[currentIndex];
  currentIndex = (currentIndex + 1) % allMessages.length;
  return message;
}

export function useTypingMessages() {
  const [isReady, setIsReady] = useState(messagesLoaded);
  const [hasMessages, setHasMessages] = useState(allMessages.length > 0);

  useEffect(() => {
    loadTypingMessages().then(() => {
      setIsReady(true);
      setHasMessages(allMessages.length > 0);
    });
  }, []);

  const getNext = useCallback((): TypingMessage | null => {
    if (!isReady) return null;
    return getNextMessage();
  }, [isReady]);

  return {
    isReady,
    hasMessages,
    getNextMessage: getNext,
  };
}
