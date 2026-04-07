'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Eye, Plus, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkillTreeGraph } from '@/components/skill-tree/SkillTreeGraph'
import { NodeEditor } from '@/components/skill-tree/NodeEditor'
import { useSkillTree } from '@/hooks/useSkillTree'
import type { D3Node, D3Edge } from '@/lib/d3/skill-tree-layout'
import { toast } from 'sonner'

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
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/teacher/skill-tree">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              <TreePine className="h-5 w-5 text-[#10B981]" />
              {treeTitle}
            </h1>
            <p className="text-sm text-gray-500">{treeDescription}</p>
          </div>
          <Badge variant="secondary">{nodes.length}개 노드</Badge>
        </div>

        <div className="flex items-center gap-2">
          {editMode && (
            <Button onClick={handleAddNode} size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              노드 추가
            </Button>
          )}
          <Button
            onClick={() => setEditMode(!editMode)}
            size="sm"
            variant={editMode ? 'default' : 'outline'}
            className={editMode ? 'bg-[#4F6BF6] hover:bg-[#4F6BF6]/90' : ''}
          >
            {editMode ? <><Eye className="mr-1 h-4 w-4" />보기 모드</> : <><Edit className="mr-1 h-4 w-4" />편집 모드</>}
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
