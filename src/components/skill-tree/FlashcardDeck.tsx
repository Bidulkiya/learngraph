'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronLeft, ChevronRight, RotateCw, Check, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFlashcardsForNode, recordFlashcardReview, type Flashcard } from '@/actions/flashcard'
import { toast } from 'sonner'

interface Props {
  nodeId: string
}

export function FlashcardDeck({ nodeId }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setCards([])
    setCurrentIndex(0)
    setFlipped(false)
    getFlashcardsForNode(nodeId).then(res => {
      if (cancelled) return
      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        setCards(res.data)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [nodeId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const current = cards[currentIndex]

  const handleNext = (): void => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setFlipped(false)
    }
  }

  const handleResult = async (result: 'known' | 'unknown'): Promise<void> => {
    if (!current) return
    await recordFlashcardReview(current.id, result)
    toast.success(result === 'known' ? '알겠어요 표시됨 ✓' : '다시 볼게요 표시됨 ✕')
    if (currentIndex < cards.length - 1) {
      handleNext()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
        <span className="ml-2 text-sm text-gray-500">플래시카드 생성 중...</span>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Sparkles className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">아직 플래시카드가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{currentIndex + 1} / {cards.length}</span>
        <span className="text-[#4F6BF6]">카드를 클릭해서 뒤집기</span>
      </div>

      {/* 카드 뒤집기 */}
      <div
        className="relative h-56 cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* 앞면 */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-[#4F6BF6]/30 bg-gradient-to-br from-[#4F6BF6]/5 to-[#7C5CFC]/5 p-6 shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <div className="mb-2 text-xs font-semibold text-[#4F6BF6]">Q. 질문</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {current.front}
              </p>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                <RotateCw className="h-3 w-3" />
                뒤집어서 답 보기
              </div>
            </div>
          </div>
          {/* 뒷면 */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-[#10B981]/30 bg-gradient-to-br from-[#10B981]/5 to-[#4F6BF6]/5 p-6 shadow-lg"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="text-center">
              <div className="mb-2 text-xs font-semibold text-[#10B981]">A. 답</div>
              <p className="text-base text-gray-800 dark:text-gray-200">
                {current.back}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 버튼 (뒷면일 때만 활성화) */}
      {flipped && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResult('unknown')}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="mr-1 h-3 w-3" />
            다시 볼게요
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResult('known')}
            className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
          >
            <Check className="mr-1 h-3 w-3" />
            알겠어요
          </Button>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          이전
        </Button>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === currentIndex ? 'bg-[#4F6BF6]' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
        >
          다음
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
