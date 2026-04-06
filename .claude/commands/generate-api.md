---
name: generate-api
description: Server Action을 생성합니다. 기능 설명을 입력하면 Vercel AI SDK v6 패턴에 맞는 Server Action 코드를 생성합니다.
argument-hint: "[기능 설명]"
user-invocable: true
---

# Server Action 생성

다음 규칙을 따라 Server Action을 생성하세요:

1. 파일 위치: `src/actions/` 디렉토리
2. 'use server' 디렉티브 필수
3. Supabase 인증 확인 필수 (createServerClient → getUser)
4. AI 호출 시 Vercel AI SDK v6 사용 (streamObject, streamText, generateObject)
5. 모델: anthropic('claude-sonnet-4-6-20250514')
6. 구조화 출력 시 Zod 스키마 사용
7. 에러 핸들링 try-catch 필수
8. TypeScript strict, 반환 타입 명시

## 요청된 기능
$ARGUMENTS
