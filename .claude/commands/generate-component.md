---
name: generate-component
description: React 컴포넌트를 생성합니다. 컴포넌트 설명을 입력하면 Next.js + Tailwind + shadcn/ui 패턴에 맞는 컴포넌트를 생성합니다.
argument-hint: "[컴포넌트 설명]"
user-invocable: true
---

# React 컴포넌트 생성

다음 규칙을 따라 컴포넌트를 생성하세요:

1. TypeScript strict mode (any 금지)
2. 'use client' 디렉티브는 클라이언트 상호작용이 있을 때만
3. Tailwind CSS로 스타일링 (인라인 style 금지)
4. shadcn/ui 컴포넌트 활용 (Button, Card, Dialog 등)
5. 150줄 초과 시 하위 컴포넌트로 분리
6. Props 인터페이스를 파일 상단에 정의
7. 한국어 UI 텍스트
8. 로딩/에러 상태 처리 포함
9. lucide-react 아이콘 사용

## 파일 위치 규칙
- 스킬트리 관련: `src/components/skill-tree/`
- 퀴즈 관련: `src/components/quiz/`
- 튜터 관련: `src/components/tutor/`
- 대시보드 관련: `src/components/dashboard/`
- 레이아웃: `src/components/layout/`
- 공통 UI: `src/components/ui/`

## 요청된 컴포넌트
$ARGUMENTS
