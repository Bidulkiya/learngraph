'use client'

import { useState, useEffect } from 'react'
import { TreePine, ClipboardCheck, Mic, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMyRecordings } from '@/actions/recording'
import { RecordingTreeMode } from './RecordingTreeMode'
import { RecordingQuizMode } from './RecordingQuizMode'

type Mode = 'select' | 'tree' | 'quiz'

/**
 * 교사 수업 녹음 페이지 — 두 모드로 분리.
 *
 * 1) "스킬트리 작성" — 녹음 내용으로 새 스킬트리를 AI가 자동 생성
 * 2) "노드 복습 퀴즈 생성" — 기존 스킬트리의 특정 노드에 복습 퀴즈를 추가
 *
 * 두 모드 모두 전사 후 Claude가 교육 외 잡음(농담/진행 멘트/말 더듬기)을
 * 자동 필터링한 뒤 파이프라인에 투입한다.
 */
export default function RecordingPage() {
  const [mode, setMode] = useState<Mode>('select')

  if (mode === 'tree') {
    return <RecordingTreeMode onBack={() => setMode('select')} />
  }
  if (mode === 'quiz') {
    return <RecordingQuizMode onBack={() => setMode('select')} />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Mic className="h-6 w-6 text-[#6366F1]" />
          수업 녹음
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          수업을 녹음하면 AI가 잡음을 제거하고 교육 내용만 뽑아내어 스킬트리를 만들거나 퀴즈를 추가합니다
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 카드 1: 스킬트리 작성 */}
        <ModeCard
          icon={<TreePine className="h-8 w-8" />}
          emoji="🌳"
          color="#10B981"
          title="스킬트리 작성"
          description="수업 내용으로 새 스킬트리를 만듭니다"
          detail="녹음 → AI 전사 → 잡음 제거 → 커리큘럼 자동 설계 → 학습 문서 + 퀴즈 자동 생성"
          onClick={() => setMode('tree')}
        />

        {/* 카드 2: 복습 퀴즈 생성 */}
        <ModeCard
          icon={<ClipboardCheck className="h-8 w-8" />}
          emoji="📝"
          color="#6366F1"
          title="복습 퀴즈 생성"
          description="수업 내용으로 특정 노드에 퀴즈를 추가합니다"
          detail="스킬트리 → 노드 선택 → 녹음 → AI가 수업에서 강조한 내용 위주로 복습 퀴즈 출제"
          onClick={() => setMode('quiz')}
        />
      </div>

      <Card className="border-dashed bg-gray-50/50 dark:bg-gray-900/30">
        <CardContent className="py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 <strong>팁</strong> — 녹음 시 마이크 권한을 허용해주세요. 한 수업당 최대 25MB (약 30-60분)까지 전사 가능합니다.
            AI가 농담·진행 멘트·말 더듬기를 자동으로 제거해 교육 내용만 추출합니다.
          </p>
        </CardContent>
      </Card>

      <RecentRecordingsList />
    </div>
  )
}

interface Recording {
  id: string
  title: string
  duration_seconds: number | null
  transcript: string | null
  summary: string | null
  created_at: string
}

function RecentRecordingsList() {
  const [expanded, setExpanded] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loaded, setLoaded] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!expanded || loaded) return
    getMyRecordings().then(res => {
      if (res.data) setRecordings(res.data as Recording[])
      setLoaded(true)
    })
  }, [expanded, loaded])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div>
      <Button
        variant="ghost"
        className="w-full justify-between text-sm text-gray-500"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          최근 녹음 기록
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {recordings.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">
              {loaded ? '녹음 기록이 없습니다' : '불러오는 중...'}
            </p>
          ) : (
            recordings.map(r => (
              <Card key={r.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title || '제목 없음'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                        {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)}분` : ''}
                      </p>
                      {r.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{r.summary}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ModeCard({
  icon,
  emoji,
  color,
  title,
  description,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  emoji: string
  color: string
  title: string
  description: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left"
    >
      <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-xl">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110"
              style={{ backgroundColor: color, boxShadow: `0 10px 30px ${color}40` }}
            >
              {icon}
            </div>
            <span className="text-3xl">{emoji}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{detail}</p>
          <span
            className="mt-auto inline-flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color }}
          >
            시작하기 →
          </span>
        </CardContent>
      </Card>
    </button>
  )
}

