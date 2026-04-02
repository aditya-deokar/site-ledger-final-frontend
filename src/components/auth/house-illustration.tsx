"use client"

export function HouseIllustration() {
  return (
    <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
      {/* Grid Pattern Background - Localized to the illustration area if needed, 
          but usually it covers the whole left side. I'll put it in layout. */}
      
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-primary"
      >
        {/* House Outline */}
        <path
          d="M200 80L80 180V320H320V180L200 80Z"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-80"
        />
        {/* Rooftop Point */}
        <circle cx="200" cy="80" r="3" fill="currentColor" />
        
        {/* Vertical Center Line */}
        <line x1="200" y1="80" x2="200" y2="320" stroke="currentColor" strokeWidth="1" className="opacity-40" />
        
        {/* Horizontal Floor Lines */}
        <line x1="80" y1="230" x2="320" y2="230" stroke="currentColor" strokeWidth="1" className="opacity-40" />
        <line x1="80" y1="280" x2="320" y2="280" stroke="currentColor" strokeWidth="1" className="opacity-40" />
        
        {/* Door Area */}
        <path
          d="M165 285H235V320H165V285Z"
          stroke="currentColor"
          strokeWidth="1"
          className="opacity-60"
        />
        
        {/* Extension Dots/Lines */}
        <line x1="120" y1="130" x2="120" y2="150" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="280" y1="130" x2="280" y2="150" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* Base Line */}
        <line x1="40" y1="320" x2="360" y2="320" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  )
}
