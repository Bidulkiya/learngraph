'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Eye, Plus, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkillTreeGraph } from '@/components/skill-tree/SkillTreeGraph'
import { NodeEditor } from '@/components/skill-tree/NodeEditor'
import { SimulationDialog } from '@/components/skill-tree/SimulationDialog'
import { useSkillTree } from '@/hooks/useSkillTree'
import type { D3Node, D3Edge } from '@/lib/d3/skill-tree-layout'

interface Props {
  treeId: string
  treeTitle: string
  treeDescription: string
  theme?: string | null
  initialNodes: D3Node[]
  initialEdges: D3Edge[]
}

export function TeacherSkillTreeView({ treeId, treeTitle, treeDescription, theme, initialNodes, initialEdges }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'edit' | 'add'>('edit')
  const [selectedNode, setSelectedNode] = useState<D3Node | null>(null)

  const {
    nodes,
    edges,
    saveNodePosition,
    editNode,
    createNode,
    removeNode,
    createEdge,
    removeEdge,
  } = useSkillTree(treeId, initialNodes, initialEdges)

  const handleNodeClick = (node: D3Node): void => {
    if (editMode) {
      setSelectedNode(node)
      setEditorMode('edit')
      setEditorOpen(true)
    }
  }

  const handleAddNode = (): void => {
    setSelectedNode(null)
    setEditorMode('add')
    setEditorOpen(true)
  }

  const handleEdgeClick = (edge: D3Edge): void => {
    if (editMode && confirm('이 연결을 삭제하시겠습니까?')) {
      removeEdge(edge.id)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/teacher/skill-tree">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
              <TreePine className="h-5 w-5 shrink-0 text-[#10B981]" />
              <span className="truncate">{treeTitle}</span>
            </h1>
            <p className="truncate text-xs text-gray-500 sm:text-sm">{treeDescription}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">{nodes.length}개 노드</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <SimulationDialog treeId={treeId} treeTitle={treeTitle} />
          {editMode && (
            <Button onClick={handleAddNode} size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">노드 추가</span>
              <span className="sm:hidden">추가</span>
            </Button>
          )}
          <Button
            onClick={() => setEditMode(!editMode)}
            size="sm"
            variant={editMode ? 'default' : 'outline'}
            className={editMode ? 'bg-[#4F6BF6] hover:bg-[#4F6BF6]/90' : ''}
          >
            {editMode
              ? <><Eye className="mr-1 h-4 w-4" /><span className="hidden sm:inline">보기 모드</span><span className="sm:hidden">보기</span></>
              : <><Edit className="mr-1 h-4 w-4" /><span className="hidden sm:inline">편집 모드</span><span className="sm:hidden">편집</span></>}
          </Button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1">
        <SkillTreeGraph
          nodes={nodes}
          edges={edges}
          editable={editMode}
          theme={theme}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={saveNodePosition}
          onEdgeClick={handleEdgeClick}
          onAddEdge={createEdge}
        />
      </div>

      {/* Node Editor Modal */}
      <NodeEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setSelectedNode(null) }}
        node={selectedNode}
        onSave={editNode}
        onDelete={removeNode}
        mode={editorMode}
        onAdd={createNode}
      />
    </div>
  )
}
