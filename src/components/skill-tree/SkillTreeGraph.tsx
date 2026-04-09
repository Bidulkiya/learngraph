'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import {
  createSkillTreeSimulation,
  getNodeSize,
  getStatusLabel,
  getTheme,
  hexagonPath,
  type D3Node,
  type D3Edge,
  type SkillTreeTheme,
  type ThemeConfig,
} from '@/lib/d3/skill-tree-layout'
import { toast } from 'sonner'

interface SkillTreeGraphProps {
  nodes: D3Node[]
  edges: D3Edge[]
  editable?: boolean
  theme?: SkillTreeTheme | string | null
  onNodeClick?: (node: D3Node) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  onEdgeClick?: (edge: D3Edge) => void
  onAddEdge?: (sourceId: string, targetId: string) => void
}

type Status = 'locked' | 'available' | 'in_progress' | 'completed'
const STATUSES: Status[] = ['locked', 'available', 'in_progress', 'completed']

/**
 * 모던 글래스모피즘 스킬트리 그래프.
 * - 노드: 글래스 + 그라데이션 + 이모지 + 상태별 데코
 * - 엣지: 부드러운 cubic bezier 곡선 + 그라데이션
 * - 애니메이션: 진입 시 staggered 페이드인, 호버, 펄스, 진행 링
 * - 배경: 별/격자/한지 패턴 (테마별)
 */
export function SkillTreeGraph({
  nodes,
  edges,
  editable = false,
  theme,
  onNodeClick,
  onNodeDragEnd,
  onEdgeClick,
  onAddEdge,
}: SkillTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [edgeMode, setEdgeMode] = useState(false)
  const [edgeSource, setEdgeSource] = useState<string | null>(null)
  const simulationRef = useRef<d3.Simulation<D3Node, D3Edge> | null>(null)

  // 테마는 prop이 바뀔 때만 재계산
  const themeConfig: ThemeConfig = useMemo(() => getTheme(theme ?? undefined), [theme])

  // Callback refs — 부모 re-render로 인한 D3 전체 재실행을 방지.
  // useEffect deps에 직접 callback을 넣으면 매 렌더마다 참조가 바뀌어
  // simulation이 리셋되고 노드가 (0,0) 근처로 튕겼다가 다시 수렴하는 버그 발생.
  const callbacksRef = useRef({ onNodeClick, onNodeDragEnd, onEdgeClick, onAddEdge })
  useEffect(() => {
    callbacksRef.current = { onNodeClick, onNodeDragEnd, onEdgeClick, onAddEdge }
  }, [onNodeClick, onNodeDragEnd, onEdgeClick, onAddEdge])

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // ─── 1. 배경 그라데이션 ───
    const bgGrad = defs.append('linearGradient')
      .attr('id', 'bg-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%')
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', themeConfig.bgFrom)
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', themeConfig.bgTo)

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#bg-gradient)')
      .style('pointer-events', 'none')

    // ─── 2. 배경 패턴 ───
    if (themeConfig.backgroundPattern === 'stars') {
      // 미세한 별 + 깜빡임 (CSS animation)
      const starGroup = svg.append('g').attr('class', 'bg-stars').style('pointer-events', 'none')
      const starCount = 35
      for (let i = 0; i < starCount; i++) {
        const cx = Math.random() * width
        const cy = Math.random() * height
        const r = Math.random() * 1.2 + 0.4
        const delay = Math.random() * 4
        const duration = 2 + Math.random() * 3
        starGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', '#ffffff')
          .attr('opacity', Math.random() * 0.5 + 0.3)
          .style('animation', `lg-twinkle ${duration}s ease-in-out ${delay}s infinite`)
      }
      // 약한 보라 nebula 글로우
      defs.append('radialGradient')
        .attr('id', 'nebula')
        .attr('cx', '50%').attr('cy', '40%').attr('r', '50%')
        .call(g => {
          g.append('stop').attr('offset', '0%').attr('stop-color', '#a855f7').attr('stop-opacity', '0.18')
          g.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7').attr('stop-opacity', '0')
        })
      svg.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'url(#nebula)')
        .style('pointer-events', 'none')
    } else if (themeConfig.backgroundPattern === 'grid') {
      // 격자 패턴 — 매우 연한 선
      const pattern = defs.append('pattern')
        .attr('id', 'grid-pattern')
        .attr('width', 50).attr('height', 50)
        .attr('patternUnits', 'userSpaceOnUse')
      pattern.append('path')
        .attr('d', 'M 50 0 L 0 0 0 50')
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 0.4)
        .attr('opacity', 0.18)
      svg.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'url(#grid-pattern)')
        .style('pointer-events', 'none')
      // 더 굵은 격자 (50px의 5배 = 250px)
      const bigPattern = defs.append('pattern')
        .attr('id', 'grid-big')
        .attr('width', 250).attr('height', 250)
        .attr('patternUnits', 'userSpaceOnUse')
      bigPattern.append('path')
        .attr('d', 'M 250 0 L 0 0 0 250')
        .attr('fill', 'none')
        .attr('stroke', '#60a5fa')
        .attr('stroke-width', 0.8)
        .attr('opacity', 0.22)
      svg.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'url(#grid-big)')
        .style('pointer-events', 'none')
    } else if (themeConfig.backgroundPattern === 'paper') {
      // 한지 질감 — 도트 노이즈 + 연한 가로선
      const dotGroup = svg.append('g').attr('class', 'bg-paper').style('pointer-events', 'none')
      for (let i = 0; i < 80; i++) {
        dotGroup.append('circle')
          .attr('cx', Math.random() * width)
          .attr('cy', Math.random() * height)
          .attr('r', Math.random() * 0.7 + 0.2)
          .attr('fill', '#fde68a')
          .attr('opacity', Math.random() * 0.12 + 0.04)
      }
      // 한지 가로선 (느슨한 줄무늬)
      for (let y = 0; y < height; y += 80) {
        dotGroup.append('line')
          .attr('x1', 0).attr('y1', y)
          .attr('x2', width).attr('y2', y + Math.random() * 4)
          .attr('stroke', '#fcd34d')
          .attr('stroke-width', 0.4)
          .attr('opacity', 0.06)
      }
    }

    // ─── 3. 노드 그라데이션 (status별 radial) ───
    STATUSES.forEach(status => {
      const colors = themeConfig.nodeColors[status]
      const grad = defs.append('radialGradient')
        .attr('id', `node-grad-${status}`)
        .attr('cx', '35%').attr('cy', '30%').attr('r', '70%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', colors.inner).attr('stop-opacity', '0.95')
      grad.append('stop').attr('offset', '60%').attr('stop-color', colors.inner).attr('stop-opacity', '0.7')
      grad.append('stop').attr('offset', '100%').attr('stop-color', colors.outer).attr('stop-opacity', '0.85')
    })

    // ─── 4. Glow 필터 ───
    STATUSES.forEach(status => {
      const colors = themeConfig.nodeColors[status]
      // Soft glow
      const f = defs.append('filter')
        .attr('id', `glow-${status}`)
        .attr('x', '-100%').attr('y', '-100%')
        .attr('width', '300%').attr('height', '300%')
      f.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
      f.append('feFlood').attr('flood-color', colors.glow).attr('flood-opacity', '0.85').attr('result', 'color')
      f.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
      const merge = f.append('feMerge')
      merge.append('feMergeNode').attr('in', 'glow')
      merge.append('feMergeNode').attr('in', 'SourceGraphic')

      // Strong glow (hover)
      const fs = defs.append('filter')
        .attr('id', `glow-strong-${status}`)
        .attr('x', '-150%').attr('y', '-150%')
        .attr('width', '400%').attr('height', '400%')
      fs.append('feGaussianBlur').attr('stdDeviation', '12').attr('result', 'blur')
      fs.append('feFlood').attr('flood-color', colors.glow).attr('flood-opacity', '1').attr('result', 'color')
      fs.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
      const mergeS = fs.append('feMerge')
      mergeS.append('feMergeNode').attr('in', 'glow')
      mergeS.append('feMergeNode').attr('in', 'SourceGraphic')
    })

    // ─── 5. 엣지 그라데이션 (출발 → 도착) ───
    const edgeGrad = defs.append('linearGradient')
      .attr('id', 'edge-gradient-base')
      .attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%')
    edgeGrad.append('stop').attr('offset', '0%').attr('stop-color', themeConfig.link.from)
    edgeGrad.append('stop').attr('offset', '100%').attr('stop-color', themeConfig.link.to)

    const edgeGradLocked = defs.append('linearGradient')
      .attr('id', 'edge-gradient-locked')
      .attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%')
    edgeGradLocked.append('stop').attr('offset', '0%').attr('stop-color', '#64748b').attr('stop-opacity', '0.4')
    edgeGradLocked.append('stop').attr('offset', '100%').attr('stop-color', '#64748b').attr('stop-opacity', '0.4')

    // ─── 6. 화살표 마커 ───
    const arrowMarker = defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse')
    arrowMarker.append('path')
      .attr('d', 'M0,-4L9,0L0,4Z')
      .attr('fill', themeConfig.link.to)
      .attr('opacity', 0.8)

    const arrowMarkerLocked = defs.append('marker')
      .attr('id', 'arrowhead-locked')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 0).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
    arrowMarkerLocked.append('path')
      .attr('d', 'M0,-4L9,0L0,4Z')
      .attr('fill', '#64748b')
      .attr('opacity', 0.4)

    // ─── 7. 데이터 클론 ───
    const simNodes: D3Node[] = nodes.map(n => ({ ...n }))
    const simEdges: D3Edge[] = edges.map(e => ({ ...e }))

    // ─── 8. Zoom 설정 ───
    const g = svg.append('g').attr('class', 'zoom-root')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // ─── 9. Simulation ───
    const simulation = createSkillTreeSimulation(simNodes, simEdges, width, height)
    simulationRef.current = simulation

    // ─── 10. Edges (cubic bezier 곡선 + path) ───
    const edgesGroup = g.append('g').attr('class', 'edges')
    const link = edgesGroup
      .selectAll<SVGPathElement, D3Edge>('path.edge')
      .data(simEdges)
      .join('path')
      .attr('class', 'edge')
      .attr('fill', 'none')
      .attr('stroke', d => {
        const targetNode = typeof d.target === 'object' ? d.target : null
        const isLocked = targetNode?.status === 'locked'
        return isLocked ? 'url(#edge-gradient-locked)' : 'url(#edge-gradient-base)'
      })
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', d => {
        const targetNode = typeof d.target === 'object' ? d.target : null
        return targetNode?.status === 'locked' ? 0.35 : themeConfig.link.opacity
      })
      .attr('stroke-dasharray', d => {
        const targetNode = typeof d.target === 'object' ? d.target : null
        return targetNode?.status === 'locked' ? '4 6' : 'none'
      })
      .attr('stroke-linecap', 'round')
      .attr('marker-end', d => {
        const targetNode = typeof d.target === 'object' ? d.target : null
        return targetNode?.status === 'locked' ? 'url(#arrowhead-locked)' : 'url(#arrowhead)'
      })
      .style('cursor', editable ? 'pointer' : 'default')
      .on('click', (_event, d) => {
        if (editable) callbacksRef.current.onEdgeClick?.(d)
      })

    // ─── 11. Node groups ───
    // 구조: <g.node> (tick이 translate 관리)
    //        └─ <g.node-inner> (hover scale 관리, D3 transition)
    //             └─ shape, icon, check-overlay
    //        └─ 링, 제목, 난이도 도트, SVG title (hover와 독립, 고정 위치)
    // 이 중첩 구조로 tick의 translate와 hover의 scale이 서로 다른
    // 요소에 적용되어 race condition이 완전히 차단된다.
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const node = nodeGroup
      .selectAll<SVGGElement, D3Node>('g.node')
      .data(simNodes, (d) => (d as D3Node).id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .style('opacity', 0)

    // 외곽 펄스 링 (available 상태 — 숨 쉬는 글로우)
    node.filter(d => d.status === 'available')
      .append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', d => getNodeSize(d.difficulty) + 8)
      .attr('fill', 'none')
      .attr('stroke', d => themeConfig.nodeColors.available.ring)
      .attr('stroke-width', 2)
      .attr('opacity', 0.55)
      .style('animation', 'lg-pulse 2.4s ease-in-out infinite')
      .style('pointer-events', 'none')

    // 외곽 데코레이션 링 (과학 테마 — 원자 궤도)
    if (themeConfig.showOrbitRing) {
      node.filter(d => d.status !== 'locked')
        .append('ellipse')
        .attr('class', 'orbit-ring')
        .attr('cx', 0).attr('cy', 0)
        .attr('rx', d => getNodeSize(d.difficulty) + 12)
        .attr('ry', d => (getNodeSize(d.difficulty) + 12) * 0.4)
        .attr('fill', 'none')
        .attr('stroke', d => themeConfig.nodeColors[d.status as Status].ring)
        .attr('stroke-width', 1.2)
        .attr('opacity', 0.45)
        .style('pointer-events', 'none')
        .attr('transform', 'rotate(-25)')
      node.filter(d => d.status !== 'locked')
        .append('ellipse')
        .attr('class', 'orbit-ring')
        .attr('cx', 0).attr('cy', 0)
        .attr('rx', d => getNodeSize(d.difficulty) + 14)
        .attr('ry', d => (getNodeSize(d.difficulty) + 14) * 0.4)
        .attr('fill', 'none')
        .attr('stroke', d => themeConfig.nodeColors[d.status as Status].ring)
        .attr('stroke-width', 0.8)
        .attr('opacity', 0.3)
        .style('pointer-events', 'none')
        .attr('transform', 'rotate(60)')
    }

    // 진행 링 (in_progress — 회전하는 원호)
    node.filter(d => d.status === 'in_progress')
      .append('circle')
      .attr('class', 'progress-ring')
      .attr('r', d => getNodeSize(d.difficulty) + 6)
      .attr('fill', 'none')
      .attr('stroke', d => themeConfig.nodeColors.in_progress.ring)
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', d => {
        const c = 2 * Math.PI * (getNodeSize(d.difficulty) + 6)
        return `${c * 0.3} ${c}`
      })
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.85)
      .style('animation', 'lg-rotate 3s linear infinite')
      .style('transform-origin', 'center')
      .style('transform-box', 'fill-box')
      .style('pointer-events', 'none')

    // Inner group — hover 시 D3 transition으로 scale.
    // 모든 자식이 (0,0) 중심이므로 scale(k)만으로 중심 기준 확대가 된다
    // (transform-box: fill-box 같은 CSS hack 필요 없음).
    const nodeInner = node.append('g').attr('class', 'node-inner')

    // 메인 노드 형상 (원 또는 육각형)
    const shape = nodeInner.append(themeConfig.nodeShape === 'hexagon' ? 'path' : 'circle')
      .attr('class', 'node-shape')
      .attr('fill', d => `url(#node-grad-${d.status})`)
      .attr('stroke', d => themeConfig.nodeColors[d.status as Status].ring)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.9)
      .style('filter', d => d.status === 'locked' ? 'none' : `url(#glow-${d.status})`)

    if (themeConfig.nodeShape === 'hexagon') {
      shape.attr('d', d => hexagonPath(getNodeSize(d.difficulty)))
    } else {
      shape.attr('r', d => getNodeSize(d.difficulty))
    }

    // locked 노드는 반투명도 높게
    nodeInner.filter(d => d.status === 'locked')
      .select('.node-shape')
      .attr('opacity', 0.55)

    // 노드 안 이모지/아이콘
    nodeInner.append('text')
      .attr('class', 'node-icon')
      .text(d => themeConfig.emoji[d.status as Status])
      .attr('text-anchor', 'middle')
      .attr('dy', d => -getNodeSize(d.difficulty) * 0.05)
      .attr('font-size', d => `${Math.round(getNodeSize(d.difficulty) * 0.5)}px`)
      .style('pointer-events', 'none')

    // 제목 텍스트 (노드 아래)
    node.append('text')
      .attr('class', 'node-title')
      .text(d => d.title.length > 8 ? d.title.slice(0, 7) + '…' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeSize(d.difficulty) + 18)
      .attr('fill', themeConfig.labelColor)
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.7)')

    // 난이도 도트 (노드 아래 더 밑)
    node.append('g')
      .attr('class', 'difficulty-dots')
      .style('pointer-events', 'none')
      .each(function (d) {
        const group = d3.select(this)
        const dotSize = 2.5
        const gap = 4
        const totalWidth = 5 * (dotSize * 2 + gap) - gap
        const startX = -totalWidth / 2 + dotSize
        const dy = getNodeSize(d.difficulty) + 33
        for (let i = 0; i < 5; i++) {
          group.append('circle')
            .attr('cx', startX + i * (dotSize * 2 + gap))
            .attr('cy', dy)
            .attr('r', dotSize)
            .attr('fill', i < d.difficulty
              ? themeConfig.nodeColors[d.status as Status].ring
              : 'rgba(255,255,255,0.18)')
            .attr('opacity', i < d.difficulty ? 0.95 : 1)
        }
      })

    // completed 노드 — 체크마크 오버레이 (우상단)
    // nodeInner에 append하여 hover 시 shape와 함께 scale.
    nodeInner.filter(d => d.status === 'completed')
      .append('g')
      .attr('class', 'check-overlay')
      .style('pointer-events', 'none')
      .each(function (d) {
        const r = getNodeSize(d.difficulty)
        const cx = r * 0.65
        const cy = -r * 0.65
        const overlay = d3.select(this)
        overlay.append('circle')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', 9)
          .attr('fill', '#10b981')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.8)
        // 체크마크 path (작은 ✓)
        overlay.append('path')
          .attr('d', `M${cx - 3.5},${cy} L${cx - 0.5},${cy + 3} L${cx + 4},${cy - 3}`)
          .attr('fill', 'none')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
      })

    // locked 노드 — 자물쇠 오버레이 (이모지로 처리되므로 그대로 유지)

    // SVG 네이티브 title (브라우저 툴팁)
    node.append('title')
      .text(d => `${d.title}\n${d.description}\n상태: ${getStatusLabel(d.status)}`)

    // ─── 12. 인터랙션 ───
    // 핵심: hover scale은 <g.node-inner>의 SVG transform attribute에 D3 transition으로 적용.
    // <g.node>의 transform은 simulation.on('tick')이 매 프레임 관리(translate),
    // <g.node-inner>의 transform은 오직 여기서만 관리(scale) → 서로 다른 요소이므로
    // race condition 없음. 과거에 CSS hover + transform-box: fill-box 방식은
    // filter가 걸린 SVG 요소에서 브라우저별 bbox 계산 차이로 노드가 왼쪽 상단으로
    // 튀는 문제가 있었음. 이 구조로 근본적으로 해결됨.
    node.on('mouseenter', function (_event, d) {
      const sel = d3.select(this)
      sel.select<SVGGElement>('.node-inner')
        .transition('hover-scale')
        .duration(180)
        .ease(d3.easeCubicOut)
        .attr('transform', 'scale(1.15)')
      sel.select<SVGElement>('.node-shape')
        .style('filter', `url(#glow-strong-${d.status})`)
        .attr('stroke-width', 3.5)
      // 연결된 엣지 하이라이트
      link
        .attr('stroke-opacity', e => {
          const sId = typeof e.source === 'object' ? e.source.id : e.source
          const tId = typeof e.target === 'object' ? e.target.id : e.target
          if (sId === d.id || tId === d.id) return 0.95
          return 0.12
        })
        .attr('stroke-width', e => {
          const sId = typeof e.source === 'object' ? e.source.id : e.source
          const tId = typeof e.target === 'object' ? e.target.id : e.target
          return sId === d.id || tId === d.id ? 3.5 : 2.5
        })
    })
    node.on('mouseleave', function (_event, d) {
      const sel = d3.select(this)
      sel.select<SVGGElement>('.node-inner')
        .transition('hover-scale')
        .duration(180)
        .ease(d3.easeCubicOut)
        .attr('transform', 'scale(1)')
      sel.select<SVGElement>('.node-shape')
        .style('filter', d.status === 'locked' ? 'none' : `url(#glow-${d.status})`)
        .attr('stroke-width', 2)
      // 엣지 원복
      link
        .attr('stroke-opacity', e => {
          const targetNode = typeof e.target === 'object' ? e.target : null
          return targetNode?.status === 'locked' ? 0.35 : themeConfig.link.opacity
        })
        .attr('stroke-width', 2.5)
    })

    // 클릭 — ripple 효과
    node.on('click', function (event, d) {
      // ripple
      const sel = d3.select(this)
      sel.append('circle')
        .attr('class', 'ripple')
        .attr('r', getNodeSize(d.difficulty))
        .attr('fill', 'none')
        .attr('stroke', themeConfig.nodeColors[d.status as Status].ring)
        .attr('stroke-width', 2)
        .attr('opacity', 0.7)
        .style('pointer-events', 'none')
        .transition()
        .duration(450)
        .attr('r', getNodeSize(d.difficulty) + 28)
        .attr('opacity', 0)
        .remove()

      if (editable && edgeMode) {
        if (!edgeSource) {
          setEdgeSource(d.id)
          toast.info(`소스 노드: ${d.title} — 타겟 노드를 클릭하세요`)
        } else if (edgeSource !== d.id) {
          callbacksRef.current.onAddEdge?.(edgeSource, d.id)
          setEdgeSource(null)
          setEdgeMode(false)
        }
        return
      }
      callbacksRef.current.onNodeClick?.(d)
    })

    // ─── 13. Drag (편집 모드) ───
    if (editable) {
      const drag = d3.drag<SVGGElement, D3Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = event.x
          d.fy = event.y
          callbacksRef.current.onNodeDragEnd?.(d.id, event.x, event.y)
        })
      node.call(drag)
    }

    // ─── 14. Tick — 곡선 path 계산 ───
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const s = d.source as D3Node
        const t = d.target as D3Node
        const sx = s.x ?? 0, sy = s.y ?? 0
        const tx = t.x ?? 0, ty = t.y ?? 0
        // 도착 노드 가장자리에서 마커가 깔끔하게 나오도록 살짝 줄임
        const dx = tx - sx, dy = ty - sy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const offset = getNodeSize(t.difficulty) + 8
        const ux = dx / dist, uy = dy / dist
        const ex = tx - ux * offset
        const ey = ty - uy * offset
        // 곡선: 중간점에서 살짝 휨 (수평 거리에 비례)
        const mx = (sx + ex) / 2
        const my = (sy + ey) / 2
        const curveOffset = Math.min(Math.abs(dx) * 0.18, 60)
        return `M${sx},${sy} Q${mx},${my - curveOffset} ${ex},${ey}`
      })
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // ─── 15. Staggered 페이드인 (진입 애니메이션) ───
    node
      .transition()
      .delay((_d, i) => i * 50)
      .duration(420)
      .ease(d3.easeCubicOut)
      .style('opacity', 1)

    return () => {
      simulation.stop()
    }
    // 주의: callback props (onNodeClick 등)는 일부러 deps에서 제외.
    // callbacksRef를 통해 항상 최신 참조를 사용하므로 부모 re-render마다
    // 전체 D3 재실행이 발생하지 않는다. 이 패턴이 없으면 부모 state가
    // 바뀔 때마다 노드 위치가 (0,0)으로 리셋되어 왼쪽 상단으로 튄다.
  }, [nodes, edges, dimensions, editable, edgeMode, edgeSource, themeConfig])

  return (
    <div
      ref={containerRef}
      className="lg-skill-tree relative h-full w-full min-h-[500px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
    >
      {editable && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => { setEdgeMode(!edgeMode); setEdgeSource(null) }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
              edgeMode
                ? 'bg-[#4F6BF6] text-white shadow-lg'
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}
          >
            {edgeMode ? '연결 모드 ON' : '노드 연결'}
          </button>
        </div>
      )}
      {edgeMode && edgeSource && (
        <div className="absolute top-12 right-3 z-10 rounded-lg bg-[#4F6BF6]/20 backdrop-blur px-3 py-1.5 text-xs text-[#c7d2fe] border border-[#4F6BF6]/40">
          타겟 노드를 클릭하세요
        </div>
      )}
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  )
}
