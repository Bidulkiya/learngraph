import * as d3 from 'd3'

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

export function createSkillTreeSimulation(
  nodes: D3Node[],
  edges: D3Edge[],
  width: number,
  height: number
): d3.Simulation<D3Node, D3Edge> {
  return d3.forceSimulation<D3Node>(nodes)
    .force('link', d3.forceLink<D3Node, D3Edge>(edges).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))
    .force('y', d3.forceY(height / 2).strength(0.05))
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
  const base = 28
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
