import { supabase } from '@/lib/supabase';
import { TypingMessage, staticTypingMessages } from '@/data/typingMessages';

export interface TypingMessagesProvider {
  name: string;
  loadMessages(): Promise<TypingMessage[]>;
}

export class SupabaseTypingMessagesProvider implements TypingMessagesProvider {
  name = 'supabase';

  async loadMessages(): Promise<TypingMessage[]> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await supabase
      .from('typing_messages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to load typing messages: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No typing messages found in database');
    }

    return data.map(row => ({
      id: row.id,
      segments: row.segments,
      displayDuration: row.display_duration ?? undefined,
      fadeOutDuration: row.fade_out_duration ?? undefined,
    }));
  }
}

export class StaticTypingMessagesProvider implements TypingMessagesProvider {
  name = 'static';

  async loadMessages(): Promise<TypingMessage[]> {
    return [...staticTypingMessages];
  }
}

export async function loadFromProviders(
  primary: TypingMessagesProvider,
  fallback: TypingMessagesProvider
): Promise<TypingMessage[]> {
  try {
    const messages = await primary.loadMessages();
    return messages;
  } catch {
    // Primary failed, try fallback
  }

  return fallback.loadMessages();
}
