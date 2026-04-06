'use client'

import { useState, useCallback, useRef } from 'react'
import {
  updateNodePosition,
  updateNode as updateNodeAction,
  addNode as addNodeAction,
  deleteNode as deleteNodeAction,
  addEdge as addEdgeAction,
  deleteEdge as deleteEdgeAction,
} from '@/actions/skill-tree'
import type { D3Node, D3Edge } from '@/lib/d3/skill-tree-layout'
import { toast } from 'sonner'

export function useSkillTree(
  skillTreeId: string,
  initialNodes: D3Node[],
  initialEdges: D3Edge[]
) {
  const [nodes, setNodes] = useState<D3Node[]>(initialNodes)
  const [edges, setEdges] = useState<D3Edge[]>(initialEdges)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Debounced position update (300ms)
  const saveNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    const existing = debounceTimers.current.get(nodeId)
    if (existing) clearTimeout(existing)

    debounceTimers.current.set(nodeId, setTimeout(async () => {
      const result = await updateNodePosition(nodeId, x, y)
      if (result.error) toast.error('위치 저장 실패: ' + result.error)
      debounceTimers.current.delete(nodeId)
    }, 300))
  }, [])

  const editNode = useCallback(async (id: string, title: string, desc: string, diff: number) => {
    const result = await updateNodeAction(id, title, desc, diff)
    if (result.error) {
      toast.error('노드 수정 실패: ' + result.error)
      return
    }
    setNodes(prev => prev.map(n => n.id === id ? { ...n, title, description: desc, difficulty: diff } : n))
    toast.success('노드가 수정되었습니다')
  }, [])

  const createNode = useCallback(async (title: string, desc: string, diff: number) => {
    const result = await addNodeAction(skillTreeId, title, desc, diff)
    if (result.error || !result.id) {
      toast.error('노드 추가 실패: ' + result.error)
      return
    }
    const newNode: D3Node = {
      id: result.id,
      title,
      description: desc,
      difficulty: diff,
      status: 'available',
    }
    setNodes(prev => [...prev, newNode])
    toast.success('노드가 추가되었습니다')
  }, [skillTreeId])

  const removeNode = useCallback(async (id: string) => {
    const result = await deleteNodeAction(id)
    if (result.error) {
      toast.error('노드 삭제 실패: ' + result.error)
      return
    }
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => {
      const srcId = typeof e.source === 'string' ? e.source : e.source.id
      const tgtId = typeof e.target === 'string' ? e.target : e.target.id
      return srcId !== id && tgtId !== id
    }))
    toast.success('노드가 삭제되었습니다')
  }, [])

  const createEdge = useCallback(async (sourceId: string, targetId: string) => {
    const result = await addEdgeAction(skillTreeId, sourceId, targetId)
    if (result.error || !result.id) {
      toast.error('연결 실패: ' + result.error)
      return
    }
    const newEdge: D3Edge = { id: result.id, source: sourceId, target: targetId }
    setEdges(prev => [...prev, newEdge])
    toast.success('노드가 연결되었습니다')
  }, [skillTreeId])

  const removeEdge = useCallback(async (edgeId: string) => {
    const result = await deleteEdgeAction(edgeId)
    if (result.error) {
      toast.error('연결 삭제 실패: ' + result.error)
      return
    }
    setEdges(prev => prev.filter(e => e.id !== edgeId))
    toast.success('연결이 삭제되었습니다')
  }, [])

  return {
    nodes,
    edges,
    saveNodePosition,
    editNode,
    createNode,
    removeNode,
    createEdge,
    removeEdge,
  }
}
