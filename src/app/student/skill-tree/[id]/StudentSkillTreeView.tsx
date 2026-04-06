'use client'

import Link from 'next/link'
import { ArrowLeft, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkillTreeGraph } from '@/components/skill-tree/SkillTreeGraph'
import type { D3Node, D3Edge } from '@/lib/d3/skill-tree-layout'
import { toast } from 'sonner'

interface Props {
  treeTitle: string
  treeDescription: string
  nodes: D3Node[]
  edges: D3Edge[]
}

export function StudentSkillTreeView({ treeTitle, treeDescription, nodes, edges }: Props) {
  const completed = nodes.filter(n => n.status === 'completed').length
  const total = nodes.length

  const handleNodeClick = (node: D3Node): void => {
    if (node.status === 'locked') {
      toast.error('선수 과목을 먼저 완료하세요')
    } else if (node.status === 'available' || node.status === 'in_progress') {
      toast.info('퀴즈 기능은 곧 추가됩니다')
    } else if (node.status === 'completed') {
      toast.success(`"${node.title}" 완료!`)
    }
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
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  )
}
