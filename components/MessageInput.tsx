'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ClipLoader } from 'react-spinners';

interface MessageInputProps {
  imageUrl: string | null;
  onSubmit: (text: string, signature: string) => Promise<boolean>;
  onClose: () => void;
}

const MAX_LENGTH = 300;
const MAX_SIGNATURE_LENGTH = 50;

export default function MessageInput({ imageUrl, onSubmit, onClose }: MessageInputProps): React.ReactElement {
  const [text, setText] = useState('');
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [floatOffset, setFloatOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Floating animation
  useEffect(() => {
    const startTime = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      // Gentle floating motion using sine wave
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = text.trim();
    const trimmedSignature = signature.trim();
    if (!trimmedText || !trimmedSignature || isSubmitting || showSuccess) return;

    setIsSubmitting(true);
    const success = await onSubmit(trimmedText, trimmedSignature);
    setIsSubmitting(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 750);
    }
  }, [text, signature, isSubmitting, showSuccess, onSubmit, onClose]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_LENGTH) {
      setText(newText);
    }
  }, []);

  const handleSignatureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSignature = e.target.value;
    if (newSignature.length <= MAX_SIGNATURE_LENGTH) {
      setSignature(newSignature);
    }
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const charCount = text.length;
  const nearLimit = charCount >= MAX_LENGTH - 20;

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${floatOffset}px) rotate(-2deg)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Polaroid container */}
        <div style={{
          width: '280px',
          padding: '12px 12px 0 12px',
          background: 'linear-gradient(145deg, #FFFFFE 0%, #FFFCF8 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '12px',
        }}>
          {/* Image area */}
          <div style={{
            width: '100%',
            aspectRatio: '1',
            background: '#e8e8e8',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '6px',
          }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Polaroid"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #E8A87C22 0%, #E8A87C44 100%)',
              }} />
            )}
            {/* Photo overlay effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 30%, rgba(0,0,0,0.08) 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Caption area with inputs */}
          <div style={{
            padding: '14px 8px 18px 8px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleChange}
              placeholder="Write your message..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '4px 0',
                fontSize: '15px',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 500,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#444',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            />
            <input
              type="text"
              value={signature}
              onChange={handleSignatureChange}
              placeholder="Your name"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '4px 0',
                marginTop: '8px',
                fontSize: '13px',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontWeight: 500,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#666',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: nearLimit ? 'space-between' : 'center',
              alignItems: 'center',
              marginTop: '10px',
            }}>
              {nearLimit && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#E8A87C',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                }}>
                  {MAX_LENGTH - charCount} left
                </span>
              )}
              <button
                type="submit"
                disabled={isSubmitting || showSuccess || !text.trim() || !signature.trim()}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  background: showSuccess ? 'rgba(232, 168, 124, 0.2)' : 'rgba(0, 0, 0, 0.06)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: showSuccess ? '#E8A87C' : '#999',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  transition: 'background 0.2s, color 0.2s',
                  border: 'none',
                  cursor: isSubmitting || showSuccess || !text.trim() || !signature.trim() ? 'default' : 'pointer',
                }}>
                {showSuccess ? '❤️ Thank you!' : isSubmitting ? <ClipLoader size={12} color="#999" /> : '↵'}
              </button>
            </div>
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
