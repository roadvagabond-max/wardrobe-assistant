import React from 'react';

/**
 * AppLogo - Sartorial Titanium Feather Logo
 * Monokróm titán-fehér toll Deep Obsidian lekerekített négyzet (squircle) alapon.
 */
export default function AppLogo({ 
  className = "w-8 h-8", 
  withSquircle = true,
  alt = "AI Wardrobe Assistant Logo" 
}) {
  if (!withSquircle) {
    // Csak a toll motívum önmagában, áttetsző háttérrel
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="100 80 340 440" 
        className={className} 
        aria-label={alt}
      >
        <defs>
          <linearGradient id="titanLightOnly" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#f1f5f9"/>
            <stop offset="100%" stop-color="#cbd5e1"/>
          </linearGradient>

          <linearGradient id="titanMutedOnly" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stop-color="#e2e8f0"/>
            <stop offset="60%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>
        </defs>

        <g transform="translate(4, -50) rotate(-6 256 256)">
          <path 
            d="M 374 116 C 320 152, 245 228, 192 316 C 202 306, 214 298, 224 290 C 184 340, 160 392, 154 424 C 162 414, 172 404, 184 394 C 230 318, 304 212, 374 116 Z" 
            fill="url(#titanMutedOnly)"
          />
          <path 
            d="M 378 116 C 410 138, 428 174, 422 214 C 416 250, 390 288, 350 332 C 360 318, 370 304, 374 290 C 342 334, 302 380, 252 420 C 262 406, 270 392, 274 380 C 242 414, 210 442, 184 454 C 190 438, 200 422, 210 406 C 265 320, 330 214, 378 116 Z" 
            fill="url(#titanLightOnly)"
          />
          <path 
            d="M 174 436 C 148 468, 126 490, 116 498 C 118 488, 130 466, 154 432 Z" 
            fill="#cbd5e1"
          />
          <path 
            d="M 377 114 C 294 228, 220 340, 144 456" 
            stroke="#0a0e17" 
            strokeWidth="3" 
            strokeLinecap="round" 
            fill="none"
          />
        </g>
      </svg>
    );
  }

  // Teljes app ikon Squircle háttérrel
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className} 
      aria-label={alt}
    >
      <defs>
        <linearGradient id="obsidianBgComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0e131d"/>
          <stop offset="100%" stopColor="#0a0e17"/>
        </linearGradient>

        <linearGradient id="titanLightComp" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="50%" stopColor="#f1f5f9"/>
          <stop offset="100%" stopColor="#cbd5e1"/>
        </linearGradient>

        <linearGradient id="titanMutedComp" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#e2e8f0"/>
          <stop offset="60%" stopColor="#94a3b8"/>
          <stop offset="100%" stopColor="#64748b"/>
        </linearGradient>

        <filter id="subtleLiftComp" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#000000" floodOpacity="0.75"/>
        </filter>
      </defs>

      <rect width="512" height="512" rx="124" fill="url(#obsidianBgComp)"/>
      <rect width="510" height="510" x="1" y="1" rx="123" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeOpacity="0.8"/>

      <g filter="url(#subtleLiftComp)" transform="translate(4, -50) rotate(-6 256 256)">
        <path 
          d="M 374 116 C 320 152, 245 228, 192 316 C 202 306, 214 298, 224 290 C 184 340, 160 392, 154 424 C 162 414, 172 404, 184 394 C 230 318, 304 212, 374 116 Z" 
          fill="url(#titanMutedComp)"
        />
        <path 
          d="M 378 116 C 410 138, 428 174, 422 214 C 416 250, 390 288, 350 332 C 360 318, 370 304, 374 290 C 342 334, 302 380, 252 420 C 262 406, 270 392, 274 380 C 242 414, 210 442, 184 454 C 190 438, 200 422, 210 406 C 265 320, 330 214, 378 116 Z" 
          fill="url(#titanLightComp)"
        />
        <path 
          d="M 174 436 C 148 468, 126 490, 116 498 C 118 488, 130 466, 154 432 Z" 
          fill="#cbd5e1"
        />
        <path 
          d="M 377 114 C 294 228, 220 340, 144 456" 
          stroke="#0a0e17" 
          strokeWidth="3" 
          strokeLinecap="round" 
          fill="none"
        />
      </g>
    </svg>
  );
}
