import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Message {
  id: number;
  text: string;
  signature: string;
  polaroidId: number | null;
  createdAt: string;
}

// Module-level state to persist across component re-renders
let allMessages: Message[] = [];
let usedIds = new Set<number>();
let messagesLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadAllMessages(): Promise<void> {
  if (!supabase) return;
  if (messagesLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    allMessages = data.map(row => ({
      id: row.id,
      text: row.text,
      signature: row.signature,
      polaroidId: row.polaroid_id,
      createdAt: row.created_at,
    }));

    messagesLoaded = true;
  })();

  return loadPromise;
}

function pickRandomMessage(): Message | null {
  if (allMessages.length === 0) return null;

  const unused = allMessages.filter(msg => !usedIds.has(msg.id));

  if (unused.length === 0) {
    usedIds.clear();
    const message = allMessages[Math.floor(Math.random() * allMessages.length)];
    usedIds.add(message.id);
    return message;
  }

  const message = unused[Math.floor(Math.random() * unused.length)];
  usedIds.add(message.id);
  return message;
}

export function useMessages() {
  const [isReady, setIsReady] = useState(messagesLoaded);
  const [hasMessages, setHasMessages] = useState(allMessages.length > 0);

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    loadAllMessages().then(() => {
      setIsReady(true);
      setHasMessages(allMessages.length > 0);
    });
  }, []);

  const getRandomMessage = useCallback((): Message | null => {
    if (!supabase || !isReady) return null;
    return pickRandomMessage();
  }, [isReady]);

  const submitMessage = useCallback(async (text: string, signature: string): Promise<boolean> => {
    if (!supabase) return false;

    const trimmedText = text.trim();
    const trimmedSignature = signature.trim();
    if (!trimmedText || trimmedText.length > 300) return false;
    if (!trimmedSignature || trimmedSignature.length > 50) return false;

    const { data, error } = await supabase
      .from('messages')
      .insert({ text: trimmedText, signature: trimmedSignature })
      .select()
      .single();

    if (error || !data) return false;

    // Add to local cache
    const newMessage: Message = {
      id: data.id,
      text: data.text,
      signature: data.signature,
      polaroidId: data.polaroid_id,
      createdAt: data.created_at,
    };
    allMessages.unshift(newMessage);
    setHasMessages(true);

    return true;
  }, []);

  return {
    isReady,
    hasMessages,
    getRandomMessage,
    submitMessage,
  };
}
