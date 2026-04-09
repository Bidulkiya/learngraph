import Link from 'next/link'

/**
 * NodeBloom 로고 — 노드 + 꽃잎 + 성장의 잎.
 *
 * 디자인 컨셉: 스킬트리의 노드를 언락하면 꽃이 피듯 지식이 확장된다.
 * - 원형 노드 테두리 (지식의 경계)
 * - 4장의 꽃잎이 중심에서 사방으로 피어남 (학습의 확산)
 * - 초록 잎 1개 (성장)
 *
 * 컬러 팔레트:
 * - #6366F1 (인디고) · #A855F7 (연보라) — 꽃잎 그라데이션
 * - #10B981 (초록) — 잎
 */

interface LogoProps {
  /** 'full' = 심볼 + 텍스트, 'symbol' = 심볼만, 'text' = 텍스트만 */
  variant?: 'full' | 'symbol' | 'text'
  /** 심볼 크기 (px). 텍스트는 자동 스케일 */
  size?: number
  /** 어두운 배경용 흰색 버전 */
  light?: boolean
  className?: string
  /** true면 홈(/)으로 링크되는 Link로 감쌈 */
  asLink?: boolean
}

export function Logo({
  variant = 'full',
  size = 36,
  light = false,
  className = '',
  asLink = false,
}: LogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {variant !== 'text' && <LogoSymbol size={size} />}
      {variant !== 'symbol' && <LogoText light={light} size={size} />}
    </span>
  )

  if (asLink) {
    return <Link href="/">{content}</Link>
  }
  return content
}

/**
 * 심볼만 렌더 — SVG. 파비콘에도 동일 디자인이 쓰인다.
 */
export function LogoSymbol({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NodeBloom logo"
    >
      <defs>
        <linearGradient id="nb-petal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="nb-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <radialGradient id="nb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#E0E7FF" />
        </radialGradient>
      </defs>

      {/* 노드 배경 원형 (약한 글로우) */}
      <circle cx="20" cy="20" r="18.5" fill="url(#nb-petal)" opacity="0.1" />
      <circle
        cx="20"
        cy="20"
        r="18.5"
        fill="none"
        stroke="url(#nb-petal)"
        strokeWidth="1.4"
        opacity="0.85"
      />

      {/* 꽃잎 4장 — 상하좌우로 피어남 */}
      <g transform="translate(20, 20)">
        {/* 위 */}
        <path
          d="M0,-13 C-5,-13 -7,-7 0,-2 C7,-7 5,-13 0,-13 Z"
          fill="url(#nb-petal)"
          opacity="0.92"
        />
        {/* 아래 */}
        <path
          d="M0,13 C-5,13 -7,7 0,2 C7,7 5,13 0,13 Z"
          fill="url(#nb-petal)"
          opacity="0.92"
        />
        {/* 왼쪽 */}
        <path
          d="M-13,0 C-13,-5 -7,-7 -2,0 C-7,7 -13,5 -13,0 Z"
          fill="url(#nb-petal)"
          opacity="0.78"
        />
        {/* 오른쪽 */}
        <path
          d="M13,0 C13,-5 7,-7 2,0 C7,7 13,5 13,0 Z"
          fill="url(#nb-petal)"
          opacity="0.78"
        />
      </g>

      {/* 성장의 잎 (우측 상단, 액센트) */}
      <path
        d="M29,9 Q34,7 35.5,11 Q32,13 29,9 Z"
        fill="url(#nb-leaf)"
      />
      <line
        x1="30"
        y1="10"
        x2="34"
        y2="11"
        stroke="#047857"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* 중심 노드 코어 */}
      <circle cx="20" cy="20" r="3.2" fill="url(#nb-core)" />
      <circle cx="20" cy="20" r="1.6" fill="#6366F1" />
    </svg>
  )
}

/**
 * 텍스트만 렌더 — "NodeBloom" (그라데이션)
 */
function LogoText({ light, size }: { light: boolean; size: number }) {
  // size 36 → text-lg, size > 48 → text-xl 등 대략 스케일
  const textSize = size <= 28 ? 'text-sm' : size <= 40 ? 'text-lg' : 'text-xl'

  if (light) {
    return (
      <span className={`${textSize} font-bold tracking-tight text-white`}>
        Node<span className="text-[#C4B5FD]">Bloom</span>
      </span>
    )
  }

  return (
    <span className={`${textSize} font-bold tracking-tight text-gray-900 dark:text-white`}>
      Node
      <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">
        Bloom
      </span>
    </span>
  )
}
