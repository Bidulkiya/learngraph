import * as d3 from 'd3'

export type SkillTreeTheme = 'science' | 'math' | 'korean' | 'default'

export interface D3Node extends d3.SimulationNodeDatum {
  id: string
  title: string
  description: string
  difficulty: number
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface D3Edge extends d3.SimulationLinkDatum<D3Node> {
  id: string
  source: string | D3Node
  target: string | D3Node
  label?: string | null
}

/**
 * 스킬트리 force simulation 생성.
 * - linkDistance 200 (노드 간 거리 넓힘)
 * - charge -650 (반발력 강화)
 * - forceY: 난이도 1 → 상단, 난이도 5 → 하단 (계층 트리 형태)
 * - collision radius getNodeSize+38
 */
export function createSkillTreeSimulation(
  nodes: D3Node[],
  edges: D3Edge[],
  width: number,
  height: number
): d3.Simulation<D3Node, D3Edge> {
  const topPadding = 100
  const bottomPadding = 70
  const usableHeight = Math.max(height - topPadding - bottomPadding, 320)

  // 난이도별 Y 위치 (1 → 상단 근처, 5 → 하단 근처)
  const yByDifficulty = (d: D3Node): number => {
    const clamped = Math.max(1, Math.min(5, d.difficulty))
    const ratio = (clamped - 1) / 4 // 0 ~ 1
    return topPadding + usableHeight * ratio
  }

  return d3.forceSimulation<D3Node>(nodes)
    .force(
      'link',
      d3.forceLink<D3Node, D3Edge>(edges)
        .id(d => d.id)
        .distance(200)
        .strength(0.32)
    )
    .force('charge', d3.forceManyBody<D3Node>().strength(-650).distanceMax(800))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
    .force('collision', d3.forceCollide<D3Node>().radius(d => getNodeSize(d.difficulty) + 38).strength(1))
    .force('y', d3.forceY<D3Node>(yByDifficulty).strength(0.5))
    .force('x', d3.forceX<D3Node>(width / 2).strength(0.035))
    .alphaDecay(0.032)
    .velocityDecay(0.5)
}

// ============================================
// 테마 시스템 v2 — 글래스모피즘 + 모던 다크
// ============================================

export interface NodeColors {
  // 원형 그라데이션 안쪽 → 바깥쪽
  inner: string
  outer: string
  // 글래스 노드 외곽 ring 색상
  ring: string
  // glow 색상 (rgba)
  glow: string
}

export interface ThemeConfig {
  // 배경 그라데이션
  bgFrom: string
  bgTo: string
  // 배경 효과 (stars / grid / paper / none)
  backgroundPattern: 'stars' | 'grid' | 'paper' | 'none'
  // 노드 색상 (status별)
  nodeColors: {
    locked: NodeColors
    available: NodeColors
    in_progress: NodeColors
    completed: NodeColors
  }
  // 연결선
  link: {
    from: string  // 출발 색상
    to: string    // 도착 색상
    opacity: number
  }
  // 텍스트
  labelColor: string
  difficultyColor: string
  // 노드 형상 (circle | hexagon)
  nodeShape: 'circle' | 'hexagon'
  // 노드 안에 표시할 이모지 (subject별)
  emoji: {
    locked: string
    available: string
    in_progress: string
    completed: string
  }
  // 데코레이션 링 표시 여부 (과학 — 원자 궤도)
  showOrbitRing: boolean
}

const THEMES: Record<SkillTreeTheme, ThemeConfig> = {
  science: {
    bgFrom: '#0a0a2e',
    bgTo: '#1a0533',
    backgroundPattern: 'stars',
    nodeColors: {
      locked: {
        inner: '#3b3a5c',
        outer: '#1a1a2e',
        ring: '#4a4a6e',
        glow: 'rgba(100, 100, 150, 0.0)',
      },
      available: {
        inner: '#a78bfa', // violet-400
        outer: '#5b21b6', // violet-800
        ring: '#c4b5fd',
        glow: 'rgba(167, 139, 250, 0.55)',
      },
      in_progress: {
        inner: '#818cf8', // indigo-400
        outer: '#3730a3', // indigo-800
        ring: '#a5b4fc',
        glow: 'rgba(129, 140, 248, 0.55)',
      },
      completed: {
        inner: '#67e8f9', // cyan-300
        outer: '#0e7490', // cyan-700
        ring: '#a5f3fc',
        glow: 'rgba(103, 232, 249, 0.65)',
      },
    },
    link: {
      from: '#a78bfa',
      to: '#67e8f9',
      opacity: 0.55,
    },
    labelColor: '#f5f3ff',
    difficultyColor: '#c7d2fe',
    nodeShape: 'circle',
    emoji: {
      locked: '🔒',
      available: '🔬',
      in_progress: '⚛️',
      completed: '✨',
    },
    showOrbitRing: true,
  },
  math: {
    bgFrom: '#0a1628',
    bgTo: '#0f2647',
    backgroundPattern: 'grid',
    nodeColors: {
      locked: {
        inner: '#334155',
        outer: '#0f172a',
        ring: '#475569',
        glow: 'rgba(100, 116, 139, 0.0)',
      },
      available: {
        inner: '#7dd3fc', // sky-300
        outer: '#075985', // sky-800
        ring: '#bae6fd',
        glow: 'rgba(125, 211, 252, 0.55)',
      },
      in_progress: {
        inner: '#60a5fa', // blue-400
        outer: '#1d4ed8', // blue-700
        ring: '#93c5fd',
        glow: 'rgba(96, 165, 250, 0.55)',
      },
      completed: {
        inner: '#22d3ee', // cyan-400
        outer: '#155e75', // cyan-800
        ring: '#67e8f9',
        glow: 'rgba(34, 211, 238, 0.6)',
      },
    },
    link: {
      from: '#60a5fa',
      to: '#22d3ee',
      opacity: 0.6,
    },
    labelColor: '#eff6ff',
    difficultyColor: '#bfdbfe',
    nodeShape: 'hexagon',
    emoji: {
      locked: '🔒',
      available: '📐',
      in_progress: '🔢',
      completed: '✅',
    },
    showOrbitRing: false,
  },
  korean: {
    bgFrom: '#1a1008',
    bgTo: '#2d1f0e',
    backgroundPattern: 'paper',
    nodeColors: {
      locked: {
        inner: '#4a3520',
        outer: '#1f1610',
        ring: '#6b4f30',
        glow: 'rgba(120, 80, 40, 0.0)',
      },
      available: {
        inner: '#fcd34d', // amber-300
        outer: '#92400e', // amber-800
        ring: '#fde68a',
        glow: 'rgba(252, 211, 77, 0.55)',
      },
      in_progress: {
        inner: '#fbbf24', // amber-400
        outer: '#78350f', // amber-900
        ring: '#fcd34d',
        glow: 'rgba(251, 191, 36, 0.55)',
      },
      completed: {
        inner: '#fde68a', // amber-200
        outer: '#b45309', // amber-700
        ring: '#fef3c7',
        glow: 'rgba(253, 230, 138, 0.65)',
      },
    },
    link: {
      from: '#fcd34d',
      to: '#d97706',
      opacity: 0.55,
    },
    labelColor: '#fef3c7',
    difficultyColor: '#fde68a',
    nodeShape: 'circle',
    emoji: {
      locked: '🔒',
      available: '📜',
      in_progress: '✍️',
      completed: '🏯',
    },
    showOrbitRing: false,
  },
  default: {
    bgFrom: '#0f1117',
    bgTo: '#1a1d2e',
    backgroundPattern: 'none',
    nodeColors: {
      locked: {
        inner: '#475569',
        outer: '#1e293b',
        ring: '#64748b',
        glow: 'rgba(100, 116, 139, 0.0)',
      },
      available: {
        inner: '#818cf8',
        outer: '#3730a3',
        ring: '#a5b4fc',
        glow: 'rgba(129, 140, 248, 0.55)',
      },
      in_progress: {
        inner: '#60a5fa',
        outer: '#1d4ed8',
        ring: '#93c5fd',
        glow: 'rgba(96, 165, 250, 0.55)',
      },
      completed: {
        inner: '#a78bfa',
        outer: '#6d28d9',
        ring: '#c4b5fd',
        glow: 'rgba(167, 139, 250, 0.6)',
      },
    },
    link: {
      from: '#818cf8',
      to: '#a78bfa',
      opacity: 0.6,
    },
    labelColor: '#f8fafc',
    difficultyColor: '#cbd5e1',
    nodeShape: 'circle',
    emoji: {
      locked: '🔒',
      available: '📘',
      in_progress: '📖',
      completed: '⭐',
    },
    showOrbitRing: false,
  },
}

export function getTheme(theme?: string | null): ThemeConfig {
  if (theme === 'science' || theme === 'math' || theme === 'korean') {
    return THEMES[theme]
  }
  return THEMES.default
}

export function getNodeSize(difficulty: number): number {
  const base = 32
  return base + (difficulty - 1) * 4
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return '완료'
    case 'available': return '도전 가능'
    case 'in_progress': return '진행 중'
    case 'locked': return '잠김'
    default: return '잠김'
  }
}

/**
 * 육각형 path 생성 (math 테마용).
 * 중심 (0,0), 반지름 r 기준.
 */
export function hexagonPath(r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const x = r * Math.cos(angle)
    const y = r * Math.sin(angle)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}
