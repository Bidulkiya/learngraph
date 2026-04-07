'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkillTreeGraph } from '@/components/skill-tree/SkillTreeGraph'
import { NodeDetailPopup } from '@/components/skill-tree/NodeDetailPopup'
import type { D3Node, D3Edge } from '@/lib/d3/skill-tree-layout'

interface Props {
  treeTitle: string
  treeDescription: string
  theme?: string | null
  nodes: D3Node[]
  edges: D3Edge[]
}

export function StudentSkillTreeView({ treeTitle, treeDescription, theme, nodes, edges }: Props) {
  const completed = nodes.filter(n => n.status === 'completed').length
  const total = nodes.length
  const [popupNode, setPopupNode] = useState<D3Node | null>(null)

  const handleNodeClick = (node: D3Node): void => {
    setPopupNode(node)
  }

  // 선수 노드 계산
  const getPrerequisites = (nodeId: string): D3Node[] => {
    const incomingEdges = edges.filter(e => {
      const targetId = typeof e.target === 'string' ? e.target : e.target.id
      return targetId === nodeId
    })
    const sourceIds = incomingEdges.map(e => (typeof e.source === 'string' ? e.source : e.source.id))
    return nodes.filter(n => sourceIds.includes(n.id))
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/student">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              <TreePine className="h-5 w-5 text-[#4F6BF6]" />
              {treeTitle}
            </h1>
            <p className="text-sm text-gray-500">{treeDescription}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          진도: {completed}/{total}
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#10B981]" /> 완료</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#F59E0B]" /> 도전 가능</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#4F6BF6]" /> 진행 중</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-[#94A3B8]" /> 잠김</span>
      </div>

      {/* Graph */}
      <div className="flex-1">
        <SkillTreeGraph
          nodes={nodes}
          edges={edges}
          editable={false}
          theme={theme}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Node detail popup */}
      <NodeDetailPopup
        open={!!popupNode}
        onClose={() => setPopupNode(null)}
        node={popupNode}
        prerequisiteNodes={popupNode ? getPrerequisites(popupNode.id) : []}
      />
    </div>
  )
}
