'use client';

/**
 * Blueprint/Modern style toggle button.
 * Pill-shaped toggle with two segments matching the dark theme.
 * Does NOT manage its own state -- parent handles via useDrawingStyle hook.
 */

import React from 'react';

interface StyleToggleProps {
  style: 'blueprint' | 'modern';
  onToggle: () => void;
}

export default function StyleToggle({ style, onToggle }: StyleToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-slate-800 p-0.5">
      <button
        type="button"
        onClick={style !== 'blueprint' ? onToggle : undefined}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          style === 'blueprint'
            ? 'bg-blue-600 text-white'
            : 'bg-transparent text-slate-400 hover:text-slate-300'
        }`}
      >
        Blueprint
      </button>
      <button
        type="button"
        onClick={style !== 'modern' ? onToggle : undefined}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          style === 'modern'
            ? 'bg-blue-600 text-white'
            : 'bg-transparent text-slate-400 hover:text-slate-300'
        }`}
      >
        Moderno
      </button>
    </div>
  );
}
