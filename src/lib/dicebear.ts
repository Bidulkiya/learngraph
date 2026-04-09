/**
 * DiceBear 아바타 URL 생성 유틸리티.
 *
 * 사용 예:
 *   dicebearUrl('지수') → https://api.dicebear.com/9.x/adventurer/svg?seed=지수
 *   dicebearUrl('지수', 80) → size=80 추가
 *   generateRandomSeed() → 8자리 랜덤 문자열
 *
 * 스타일: adventurer (귀여운 모험가 캐릭터)
 */

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/adventurer/svg'

/**
 * 시드값으로 DiceBear SVG URL 생성.
 * @param seed 닉네임 또는 랜덤 문자열 (한글/영문/숫자 OK, URL 인코딩 됨)
 * @param size 픽셀 단위 크기 (선택)
 */
export function dicebearUrl(seed: string, size?: number): string {
  const params = new URLSearchParams()
  params.set('seed', seed)
  if (size) params.set('size', String(size))
  return `${DICEBEAR_BASE}?${params.toString()}`
}

/**
 * 랜덤 시드 생성 (아바타 변경용).
 * 8자리 영문+숫자 조합.
 */
export function generateRandomSeed(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

/**
 * 랜덤 시드 N개 생성.
 */
export function generateRandomSeeds(count: number): string[] {
  return Array.from({ length: count }, () => generateRandomSeed())
}
