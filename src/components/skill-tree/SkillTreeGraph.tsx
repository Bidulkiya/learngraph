'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  createSkillTreeSimulation,
  getNodeSize,
  getStatusLabel,
  getTheme,
  type D3Node,
  type D3Edge,
  type SkillTreeTheme,
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

  // 현재 테마
  const themeConfig = getTheme(theme ?? undefined)

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

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', themeConfig.linkColor)

    // Node gradient 정의 (status별 × gradient)
    ;(['locked', 'available', 'in_progress', 'completed'] as const).forEach(status => {
      const [c1, c2] = themeConfig.nodeGradient[status]
      const gradient = defs.append('radialGradient')
        .attr('id', `node-grad-${status}`)
        .attr('cx', '30%')
        .attr('cy', '30%')
      gradient.append('stop').attr('offset', '0%').attr('stop-color', c1)
      gradient.append('stop').attr('offset', '100%').attr('stop-color', c2)
    })

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Strong glow (hover)
    const strongFilter = defs.append('filter')
      .attr('id', 'glow-strong')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')
    strongFilter.append('feGaussianBlur').attr('stdDeviation', '9').attr('result', 'coloredBlur')
    const strongMerge = strongFilter.append('feMerge')
    strongMerge.append('feMergeNode').attr('in', 'coloredBlur')
    strongMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // 배경 패턴 그리기
    if (themeConfig.backgroundPattern === 'stars') {
      // 별 패턴
      const starGroup = svg.append('g').attr('class', 'bg-stars').style('pointer-events', 'none')
      for (let i = 0; i < 80; i++) {
        const cx = Math.random() * width
        const cy = Math.random() * height
        const r = Math.random() * 1.4 + 0.4
        starGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', '#ffffff')
          .attr('opacity', Math.random() * 0.6 + 0.3)
      }
    } else if (themeConfig.backgroundPattern === 'grid') {
      // 격자 패턴
      const pattern = defs.append('pattern')
        .attr('id', 'grid-pattern')
        .attr('width', 40)
        .attr('height', 40)
        .attr('patternUnits', 'userSpaceOnUse')
      pattern.append('path')
        .attr('d', 'M 40 0 L 0 0 0 40')
        .attr('fill', 'none')
        .attr('stroke', '#60a5fa')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.3)
      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'url(#grid-pattern)')
        .style('pointer-events', 'none')
    } else if (themeConfig.backgroundPattern === 'paper') {
      // 종이 질감 (도트)
      const dotGroup = svg.append('g').attr('class', 'bg-paper').style('pointer-events', 'none')
      for (let i = 0; i < 150; i++) {
        dotGroup.append('circle')
          .attr('cx', Math.random() * width)
          .attr('cy', Math.random() * height)
          .attr('r', Math.random() * 0.8 + 0.3)
          .attr('fill', '#fde68a')
          .attr('opacity', Math.random() * 0.15 + 0.05)
      }
    }

    // Clone data for D3 mutation
    const simNodes: D3Node[] = nodes.map(n => ({ ...n }))
    const simEdges: D3Edge[] = edges.map(e => ({ ...e }))

    // Zoom
    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Simulation
    const simulation = createSkillTreeSimulation(simNodes, simEdges, width, height)
    simulationRef.current = simulation

    // Edges
    const link = g.append('g')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', themeConfig.linkColor)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', themeConfig.linkOpacity)
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', editable ? 'pointer' : 'default')
      .on('click', (_event, d) => {
        if (editable && onEdgeClick) onEdgeClick(d)
      })

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')

    // Node circles with gradient
    const circles = node.append('circle')
      .attr('r', d => getNodeSize(d.difficulty))
      .attr('fill', d => `url(#node-grad-${d.status})`)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.85)
      .style('filter', d => (d.status === 'locked' ? 'none' : 'url(#glow)'))
      .style('transition', 'filter 0.25s ease, stroke-width 0.25s ease')

    // Node labels (최대 6자까지만)
    node.append('text')
      .text(d => d.title.length > 6 ? d.title.slice(0, 5) + '…' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', themeConfig.labelColor)
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.6)')

    // Difficulty badge
    node.append('text')
      .text(d => `Lv.${d.difficulty}`)
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeSize(d.difficulty) + 16)
      .attr('fill', themeConfig.difficultyColor)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')

    // Tooltip on hover
    node.append('title')
      .text(d => `${d.title}\n${d.description}\n상태: ${getStatusLabel(d.status)}`)

    // Hover — strong glow
    node.on('mouseenter', function () {
      d3.select(this).select<SVGCircleElement>('circle')
        .style('filter', 'url(#glow-strong)')
        .attr('stroke-width', 4)
    })
    node.on('mouseleave', function (_event, d) {
      d3.select(this).select<SVGCircleElement>('circle')
        .style('filter', d.status === 'locked' ? 'none' : 'url(#glow)')
        .attr('stroke-width', 2.5)
    })

    // Node click
    node.on('click', (_event, d) => {
      if (editable && edgeMode) {
        if (!edgeSource) {
          setEdgeSource(d.id)
          toast.info(`소스 노드: ${d.title} — 타겟 노드를 클릭하세요`)
        } else if (edgeSource !== d.id) {
          onAddEdge?.(edgeSource, d.id)
          setEdgeSource(null)
          setEdgeMode(false)
        }
        return
      }
      onNodeClick?.(d)
    })

    // Drag behavior (edit mode only)
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
          onNodeDragEnd?.(d.id, event.x, event.y)
        })
      node.call(drag)
    }

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x ?? 0)
        .attr('y1', d => (d.source as D3Node).y ?? 0)
        .attr('x2', d => (d.target as D3Node).x ?? 0)
        .attr('y2', d => (d.target as D3Node).y ?? 0)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, dimensions, editable, edgeMode, edgeSource, onNodeClick, onNodeDragEnd, onEdgeClick, onAddEdge, themeConfig])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[500px] rounded-xl border overflow-hidden dark:border-gray-800"
      style={{ background: themeConfig.background }}
    >
      {editable && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => { setEdgeMode(!edgeMode); setEdgeSource(null) }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              edgeMode
                ? 'bg-[#4F6BF6] text-white shadow-lg'
                : 'bg-white/90 text-gray-800 hover:bg-white backdrop-blur dark:bg-gray-800/90 dark:text-gray-200'
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
