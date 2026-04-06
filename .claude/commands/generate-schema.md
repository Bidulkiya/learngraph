---
name: generate-schema
description: AI 출력용 Zod 스키마를 생성합니다. 원하는 AI 출력 구조를 설명하면 Zod 스키마 + TypeScript 타입을 생성합니다.
argument-hint: "[스키마 설명]"
user-invocable: true
---

# Zod 스키마 생성

다음 규칙을 따라 Zod 스키마를 생성하세요:

1. 파일 위치: `src/lib/ai/schemas.ts`에 추가
2. z.object() 기반, 각 필드에 .describe() 필수 (AI가 필드 목적을 이해하도록)
3. z.infer<typeof schema>로 TypeScript 타입 자동 추론
4. export 필수 (스키마 + 타입 모두)
5. 네이밍: schema → camelCase + Schema 접미사, 타입 → PascalCase + Output 접미사

## 예시
```typescript
export const mySchema = z.object({
  title: z.string().describe('제목'),
  items: z.array(z.object({
    name: z.string().describe('항목 이름'),
    value: z.number().describe('수치 값'),
  })).describe('항목 목록'),
})

export type MyOutput = z.infer<typeof mySchema>
```

## 요청된 스키마
$ARGUMENTS
