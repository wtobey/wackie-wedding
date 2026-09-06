'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ClipLoader } from 'react-spinners';
import { useSecurityGate, SecurityQuestion } from '@/hooks/useSecurityGate';

interface SecurityGateProps {
  children: React.ReactNode;
}

export default function SecurityGate({ children }: SecurityGateProps): React.ReactElement {
  const { isVerified, isLoading, questions, error, verifyAnswer } = useSecurityGate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [floatOffset, setFloatOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  // Floating animation
  useEffect(() => {
    const startTime = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const offset = Math.sin(elapsed / 1500) * 8;
      setFloatOffset(offset);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Focus input when question changes
  useEffect(() => {
    if (!isLoading && !isVerified && questions.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, isVerified, questions.length, selectedIndex]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || isVerifying) return;

    const selectedQuestion = questions[selectedIndex];
    if (!selectedQuestion) return;

    setIsVerifying(true);
    await verifyAnswer(selectedQuestion.id, trimmedAnswer);
    setIsVerifying(false);
  }, [answer, isVerifying, questions, selectedIndex, verifyAnswer]);

  const handleTabClick = useCallback((index: number) => {
    setSelectedIndex(index);
    setAnswer('');
    inputRef.current?.focus();
  }, []);

  // Verified - render children
  if (isVerified) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100dvh',
        background: '#FAF9F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ClipLoader size={32} color="#E8A87C" />
      </div>
    );
  }

  const selectedQuestion: SecurityQuestion | undefined = questions[selectedIndex];

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: '#FAF9F7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          transform: `translateY(${floatOffset}px) rotate(-2deg)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Polaroid container */}
        <div style={{
          width: '320px',
          padding: '16px 16px 0 16px',
          background: 'linear-gradient(145deg, #FFFFFE 0%, #FFFCF8 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: '12px',
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <p style={{
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: 400,
              margin: 0,
              color: '#E8A87C',
            }}>
              Before we begin...
            </p>
            <p style={{
              fontSize: '13px',
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: 400,
              color: '#888',
              marginTop: '8px',
            }}>
              answer any of these three questions to enter.
            </p>
          </div>

          {/* Question tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
          }}>
            {questions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTabClick(index)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  borderRadius: '6px',
                  background: selectedIndex === index
                    ? 'rgba(232, 168, 124, 0.2)'
                    : 'rgba(0, 0, 0, 0.04)',
                  color: selectedIndex === index ? '#E8A87C' : '#999',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                Q{index + 1}
              </button>
            ))}
          </div>

          {/* Question display */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.03)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            minHeight: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p style={{
              fontSize: '15px',
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontWeight: 500,
              color: '#444',
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              {selectedQuestion?.question || 'No question available'}
            </p>
            {selectedQuestion?.hint && (
              <p style={{
                fontSize: '12px',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 400,
                color: '#999',
                marginTop: '8px',
                fontStyle: 'italic',
              }}>
                Hint: {selectedQuestion.hint}
              </p>
            )}
          </div>

          {/* Answer input */}
          <div style={{
            padding: '0 8px 20px 8px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              disabled={isVerifying}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 500,
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#444',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            />

            {/* Error message */}
            {error && (
              <p style={{
                fontSize: '12px',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 500,
                color: '#e74c3c',
                marginTop: '10px',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!answer.trim() || isVerifying}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: answer.trim() && !isVerifying
                  ? 'rgba(232, 168, 124, 0.9)'
                  : 'rgba(0, 0, 0, 0.06)',
                color: answer.trim() && !isVerifying ? 'white' : '#999',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: answer.trim() && !isVerifying ? 'pointer' : 'default',
                transition: 'background 0.2s, color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isVerifying ? (
                <ClipLoader size={16} color="#999" />
              ) : (
                'Enter'
              )}
            </button>
          </div>
        </div>

        {/* Polaroid sheen overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.02) 100%)',
          pointerEvents: 'none',
          borderRadius: '12px',
        }} />
      </form>
    </div>
  );
}
