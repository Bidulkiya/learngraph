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
 * - linkDistance 190 (노드 간 거리 넓힘)
 * - charge -550 (반발력 강화)
 * - forceY: 난이도 1 → 상단, 난이도 5 → 하단 (계층 트리 형태)
 * - collision radius 64 (노드 겹침 방지 강화)
 */
export function createSkillTreeSimulation(
  nodes: D3Node[],
  edges: D3Edge[],
  width: number,
  height: number
): d3.Simulation<D3Node, D3Edge> {
  const topPadding = 90
  const bottomPadding = 60
  const usableHeight = Math.max(height - topPadding - bottomPadding, 300)

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
        .distance(190)
        .strength(0.35)
    )
    .force('charge', d3.forceManyBody<D3Node>().strength(-550).distanceMax(700))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force('collision', d3.forceCollide<D3Node>().radius(d => getNodeSize(d.difficulty) + 34).strength(1))
    // 난이도 기반 Y (수직 계층)
    .force('y', d3.forceY<D3Node>(yByDifficulty).strength(0.45))
    // 약한 X 센터링 (좌우로 퍼지도록)
    .force('x', d3.forceX<D3Node>(width / 2).strength(0.04))
    .alphaDecay(0.035)
    .velocityDecay(0.5)
}

// ============================================
// 테마 시스템 (과목별)
// ============================================

export interface ThemeConfig {
  background: string           // SVG 배경 그라데이션
  backgroundPattern?: string    // 배경 패턴 (격자, 점 등)
  nodeGradient: {
    locked: [string, string]
    available: [string, string]
    in_progress: [string, string]
    completed: [string, string]
  }
  linkColor: string
  linkOpacity: number
  labelColor: string
  difficultyColor: string
  glowColor: string
}

const THEMES: Record<SkillTreeTheme, ThemeConfig> = {
  science: {
    // 진한 남색 + 별/원자 느낌
    background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0c29 100%)',
    backgroundPattern: 'stars',
    nodeGradient: {
      locked: ['#334155', '#1e293b'],
      available: ['#a855f7', '#6b21a8'],        // 보라
      in_progress: ['#6366f1', '#3730a3'],      // 청색
      completed: ['#22d3ee', '#0891b2'],        // 시안
    },
    linkColor: '#818cf8',
    linkOpacity: 0.55,
    labelColor: '#f0f9ff',
    difficultyColor: '#c7d2fe',
    glowColor: 'rgba(168, 85, 247, 0.65)',
  },
  math: {
    // 진한 파랑 + 기하학 격자
    background: 'linear-gradient(180deg, #0b1a3e 0%, #0a1128 100%)',
    backgroundPattern: 'grid',
    nodeGradient: {
      locked: ['#334155', '#1e293b'],
      available: ['#38bdf8', '#0369a1'],        // 하늘
      in_progress: ['#3b82f6', '#1e40af'],      // 청
      completed: ['#06b6d4', '#0e7490'],        // 시안
    },
    linkColor: '#60a5fa',
    linkOpacity: 0.6,
    labelColor: '#eff6ff',
    difficultyColor: '#bfdbfe',
    glowColor: 'rgba(56, 189, 248, 0.7)',
  },
  korean: {
    // 따뜻한 갈색 + 고전 한지 느낌
    background: 'linear-gradient(180deg, #3e2723 0%, #1c0f0b 100%)',
    backgroundPattern: 'paper',
    nodeGradient: {
      locked: ['#57534e', '#292524'],
      available: ['#fbbf24', '#b45309'],        // 금색
      in_progress: ['#d97706', '#78350f'],      // 황토
      completed: ['#f59e0b', '#92400e'],        // 진한 금
    },
    linkColor: '#fcd34d',
    linkOpacity: 0.5,
    labelColor: '#fef3c7',
    difficultyColor: '#fde68a',
    glowColor: 'rgba(251, 191, 36, 0.7)',
  },
  default: {
    // 기본 밝은 테마
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    nodeGradient: {
      locked: ['#cbd5e1', '#94a3b8'],
      available: ['#fbbf24', '#f59e0b'],
      in_progress: ['#60a5fa', '#4F6BF6'],
      completed: ['#34d399', '#10B981'],
    },
    linkColor: '#cbd5e1',
    linkOpacity: 0.75,
    labelColor: '#ffffff',
    difficultyColor: '#64748b',
    glowColor: 'rgba(79, 107, 246, 0.5)',
  },
}

export function getTheme(theme?: string | null): ThemeConfig {
  if (theme === 'science' || theme === 'math' || theme === 'korean') {
    return THEMES[theme]
  }
  return THEMES.default
}

export function getNodeColor(status: string): string {
  switch (status) {
    case 'completed': return '#10B981'
    case 'available': return '#F59E0B'
    case 'in_progress': return '#4F6BF6'
    case 'locked': return '#94A3B8'
    default: return '#94A3B8'
  }
}

export function getNodeGlow(status: string): string {
  switch (status) {
    case 'completed': return '0 0 20px rgba(16, 185, 129, 0.6)'
    case 'available': return '0 0 20px rgba(245, 158, 11, 0.6)'
    case 'in_progress': return '0 0 15px rgba(79, 107, 246, 0.4)'
    default: return 'none'
  }
}

export function getNodeSize(difficulty: number): number {
  const base = 30
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
