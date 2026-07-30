'use client';

import { useState } from 'react';

export default function HeroGraphic() {
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);

  // Updated state 2 background hover color
  const HOVER_COLOR = "#D3EEFF";
  const HOVER_TEXT_COLOR = "#0A2B5C";

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 538 535" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="select-none drop-shadow-sm"
    >
      {/* Outer Frame Box Container */}
      <path 
        d="M533.19 529.572L528.678 529.559L15.1777 528.059L7.59473 528.037L11.2471 521.392L151.567 266.038L14.2295 11.194L10.6377 4.52991L18.208 4.5592L528.708 6.5592L533.19 6.57678V529.572Z" 
        fill="#FFFEFE" 
        stroke="black" 
        strokeWidth="9"
      />
      
      {/* ================= BLUE SHAPE GROUP ================= */}
      <g 
        onMouseEnter={() => setHoveredShape('blue')}
        onMouseLeave={() => setHoveredShape(null)}
        className="cursor-pointer"
      >
        <path 
          d="M162.69 267.059L28.1904 516.559L522.69 518.559V256.059L162.69 267.059Z" 
          fill={hoveredShape === 'blue' ? HOVER_COLOR : "#0264F6"}
          style={{ transition: 'fill 300ms ease-out' }}
        />
        
        {/* Raising Hand Image Content Container */}
        <g style={{ 
          opacity: hoveredShape === 'blue' ? 0 : 1, 
          transition: 'opacity 300ms ease-out',
          pointerEvents: 'none'
        }}>
          <image 
            x="197.19" 
            y="274.059" 
            width="213" 
            height="244" 
            href="/design/raising-hand.png"
          />
        </g>

        {/* Brand Text Content Container */}
        <g style={{ 
          opacity: hoveredShape === 'blue' ? 1 : 0, 
          transition: 'opacity 300ms ease-out',
          pointerEvents: 'none'
        }}>
          <text 
            x="270" 
            y="380" 
            fontFamily="MuseoModerno, sans-serif" 
            fontSize="56" 
            fontWeight="400" 
            fill={HOVER_TEXT_COLOR}
            textAnchor="middle"
          >
            METIS
          </text>
          <text 
            x="270" 
            y="415" 
            fontFamily="Muna, sans-serif" 
            fontSize="16" 
            fontWeight="400" 
            fill={HOVER_TEXT_COLOR}
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            education platform
          </text>
        </g>
      </g>

      {/* ================= YELLOW SHAPE GROUP ================= */}
      <g
        onMouseEnter={() => setHoveredShape('yellow')}
        onMouseLeave={() => setHoveredShape(null)}
        className="cursor-pointer"
      >
        <path 
          d="M160.69 258.059L30.1904 17.0592H293.19L160.69 258.059Z" 
          fill={hoveredShape === 'yellow' ? HOVER_COLOR : "#FADD04"}
          style={{ transition: 'fill 300ms ease-out' }}
        />
        <text 
          x="160" 
          y="130" 
          fontFamily="Muna, sans-serif" 
          fontSize="24" 
          fill="#051C3E"
          textAnchor="middle"
          style={{ 
            opacity: hoveredShape === 'yellow' ? 1 : 0, 
            transition: 'opacity 300ms ease-out',
            pointerEvents: 'none' 
          }}
        >
          clarity.
        </text>
      </g>

      {/* ================= GREEN SHAPE GROUP ================= */}
      <g
        onMouseEnter={() => setHoveredShape('green')}
        onMouseLeave={() => setHoveredShape(null)}
        className="cursor-pointer"
      >
        <path 
          d="M299.69 19.0592L166.19 261.059L516.69 252.059L299.69 19.0592Z" 
          fill={hoveredShape === 'green' ? HOVER_COLOR : "#19938F"}
          style={{ transition: 'fill 300ms ease-out' }}
        />
        <text 
          x="325" 
          y="140" 
          fontFamily="Muna, sans-serif" 
          fontSize="24" 
          fill="#03193A"
          textAnchor="middle"
          style={{ 
            opacity: hoveredShape === 'green' ? 1 : 0, 
            transition: 'opacity 300ms ease-out',
            pointerEvents: 'none' 
          }}
        >
          growth.
        </text>
      </g>

      {/* ================= PINK SHAPE GROUP ================= */}
      <g
        onMouseEnter={() => setHoveredShape('pink')}
        onMouseLeave={() => setHoveredShape(null)}
        className="cursor-pointer"
      >
        <path 
          d="M523.69 250.559L307.19 17.0592H523.69V250.559Z" 
          fill={hoveredShape === 'pink' ? HOVER_COLOR : "#FF67E7"}
          style={{ transition: 'fill 300ms ease-out' }}
        />
        <text 
          x="440" 
          y="120" 
          fontFamily="Muna, sans-serif" 
          fontSize="24" 
          fill="#051C3E"
          textAnchor="middle"
          style={{ 
            opacity: hoveredShape === 'pink' ? 1 : 0, 
            transition: 'opacity 300ms ease-out',
            pointerEvents: 'none' 
          }}
        >
          results.
        </text>
      </g>
    </svg>
  );
}