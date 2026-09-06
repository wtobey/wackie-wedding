import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'wedding_access_token';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface SecurityQuestion {
  id: number;
  question: string;
  hint: string | null;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function selectRandomQuestions(questions: SecurityQuestion[], count: number): SecurityQuestion[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function verifyTokenWithServer(token: string): Promise<boolean> {
  if (!SUPABASE_URL) return false;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.valid === true;
  } catch (err) {
    console.error('Token verification error:', err);
    return false;
  }
}

export function useSecurityGate() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Verify existing token and load questions on mount
  useEffect(() => {
    if (!supabase || !SUPABASE_URL) {
      // No Supabase configured — skip the gate so the site stays viewable.
      // Matches the "no questions configured" branch below (which also verifies).
      // The original set this to `false`, which dead-ended the gate with no way
      // through whenever the backend was absent (e.g. local dev / this demo).
      setIsVerified(true);
      setIsLoading(false);
      return;
    }

    async function initialize() {
      // Check for existing token
      const existingToken = getStoredToken();
      console.log(existingToken);
      if (existingToken) {
        const isValid = await verifyTokenWithServer(existingToken);
        if (isValid) {
          console.log("Has valid token");
          setIsVerified(true);
          setIsLoading(false);
          return;
        }
        // Token invalid/expired - clear it
        clearToken();
      }

      // Load questions for the gate
      try {
        const { data, error: fetchError } = await supabase!
          .from('security_questions_public')
          .select('*');

        if (fetchError) {
          console.error('Failed to load security questions:', fetchError);
          setError('Failed to load questions. Please refresh.');
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          // No questions configured - skip security gate
          console.log("Has no data");
          setIsVerified(true);
          setIsLoading(false);
          return;
        }

        const allQuestions: SecurityQuestion[] = data.map(row => ({
          id: row.id,
          question: row.question,
          hint: row.hint,
        }));

        // Select 3 random questions (or all if fewer than 3)
        const selected = selectRandomQuestions(allQuestions, Math.min(3, allQuestions.length));
        setQuestions(selected);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions. Please refresh.');
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  const verifyAnswer = useCallback(async (questionId: number, answer: string): Promise<boolean> => {
    if (!SUPABASE_URL) return true;

    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-security-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          answer: answer.trim(),
        }),
      });

      if (!response.ok) {
        setError('Verification failed. Please try again.');
        return false;
      }

      const data = await response.json();

      if (data.verified && data.token) {
        console.log("Web response verified")
        storeToken(data.token);
        setIsVerified(true);
        return true;
      }

      setError(data.error || 'Incorrect answer. Try again or pick a different question.');
      return false;
    } catch (err) {
      console.error('Verification error:', err);
      setError('Verification failed. Please try again.');
      return false;
    }
  }, []);

  return {
    isVerified,
    isLoading,
    questions,
    error,
    verifyAnswer,
  };
}
