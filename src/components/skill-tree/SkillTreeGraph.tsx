'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  createSkillTreeSimulation,
  getNodeColor,
  getNodeGlow,
  getNodeSize,
  getStatusLabel,
  type D3Node,
  type D3Edge,
} from '@/lib/d3/skill-tree-layout'
import { toast } from 'sonner'

interface SkillTreeGraphProps {
  nodes: D3Node[]
  edges: D3Edge[]
  editable?: boolean
  onNodeClick?: (node: D3Node) => void
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void
  onEdgeClick?: (edge: D3Edge) => void
  onAddEdge?: (sourceId: string, targetId: string) => void
}

export function SkillTreeGraph({
  nodes,
  edges,
  editable = false,
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

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94A3B8')

    // Glow filter
    const defs = svg.select('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

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
      .attr('stroke', '#CBD5E1')
      .attr('stroke-width', 2)
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

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeSize(d.difficulty))
      .attr('fill', d => getNodeColor(d.status))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)
      .style('filter', d => getNodeGlow(d.status) !== 'none' ? 'url(#glow)' : 'none')
      .style('transition', 'fill 0.3s, filter 0.3s')

    // Node labels
    node.append('text')
      .text(d => d.title.length > 8 ? d.title.slice(0, 7) + '…' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none')

    // Difficulty badge
    node.append('text')
      .text(d => `Lv.${d.difficulty}`)
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeSize(d.difficulty) + 14)
      .attr('fill', '#64748B')
      .attr('font-size', '10px')
      .style('pointer-events', 'none')

    // Tooltip on hover
    node.append('title')
      .text(d => `${d.title}\n${d.description}\n상태: ${getStatusLabel(d.status)}`)

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
  }, [nodes, edges, dimensions, editable, edgeMode, edgeSource, onNodeClick, onNodeDragEnd, onEdgeClick, onAddEdge])

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-[500px] rounded-xl border bg-white dark:bg-gray-950 dark:border-gray-800 overflow-hidden">
      {editable && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={() => { setEdgeMode(!edgeMode); setEdgeSource(null) }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              edgeMode
                ? 'bg-[#4F6BF6] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {edgeMode ? '연결 모드 ON' : '노드 연결'}
          </button>
        </div>
      )}
      {edgeMode && edgeSource && (
        <div className="absolute top-12 right-3 z-10 rounded-lg bg-[#4F6BF6]/10 px-3 py-1.5 text-xs text-[#4F6BF6]">
          타겟 노드를 클릭하세요
        </div>
      )}
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  )
}
