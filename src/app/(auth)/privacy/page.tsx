import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LogoSymbol } from '@/components/Logo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <LogoSymbol size={32} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">개인정보처리방침</h1>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-gray-500">최종 수정일: 2026년 4월 10일</p>

          <h2>1. 개인정보 수집 항목</h2>
          <p>NodeBloom은 서비스 제공을 위해 다음 항목을 수집합니다:</p>
          <table>
            <thead>
              <tr><th>구분</th><th>수집 항목</th><th>수집 목적</th></tr>
            </thead>
            <tbody>
              <tr><td>필수</td><td>이메일, 이름, 비밀번호(암호화), 역할(교사/학생/학부모/운영자)</td><td>회원 식별, 로그인, 역할 기반 접근 제어</td></tr>
              <tr><td>선택</td><td>닉네임, 학년, 관심 과목, 학습 목표, 담당 과목, 한 줄 소개</td><td>맞춤형 학습 경험 제공, 프로필 표시</td></tr>
              <tr><td>자동 생성</td><td>학습 진도, 퀴즈 결과, 경험치, 스트릭, 학습 시간, AI 분석 결과</td><td>학습 현황 분석, 대시보드 표시, AI 학습 코치</td></tr>
            </tbody>
          </table>

          <h2>2. 개인정보 수집 및 이용 목적</h2>
          <ul>
            <li>서비스 회원 관리 및 본인 확인</li>
            <li>스킬트리 기반 맞춤형 학습 서비스 제공</li>
            <li>AI 퀴즈 생성, 학습 코칭, 감정 분석 등 AI 교육 기능 제공</li>
            <li>학부모 연결 및 학습 현황 리포트 제공</li>
            <li>서비스 개선을 위한 통계 분석 (비식별 처리)</li>
          </ul>

          <h2>3. 개인정보 보유 및 이용 기간</h2>
          <ul>
            <li>회원 탈퇴 시 즉시 파기 (CASCADE 삭제)</li>
            <li>관련 법령에 의한 보존 필요 시 해당 기간 동안 보관</li>
            <li>비활성 계정: 1년 이상 미로그인 시 사전 안내 후 삭제 가능</li>
          </ul>

          <h2>4. 개인정보의 제3자 제공</h2>
          <p>
            NodeBloom은 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 다음의 경우에는 예외로 합니다:
          </p>
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의하여 요구되는 경우</li>
          </ul>

          <h2>5. 개인정보 처리 위탁</h2>
          <table>
            <thead>
              <tr><th>수탁자</th><th>위탁 업무</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase Inc.</td><td>데이터베이스 호스팅 및 인증 서비스</td></tr>
              <tr><td>Vercel Inc.</td><td>웹 애플리케이션 호스팅</td></tr>
              <tr><td>Anthropic PBC</td><td>AI 학습 콘텐츠 생성 (API 호출, 개인정보 미전송)</td></tr>
              <tr><td>OpenAI Inc.</td><td>텍스트 임베딩 및 음성 인식 (API 호출)</td></tr>
            </tbody>
          </table>

          <h2>6. 개인정보의 안전성 확보 조치</h2>
          <ul>
            <li>비밀번호 암호화 저장 (Supabase Auth bcrypt)</li>
            <li>HTTPS 전송 암호화</li>
            <li>데이터베이스 행 수준 보안(RLS) 정책 적용</li>
            <li>관리자 접근 권한 최소화</li>
          </ul>

          <h2>7. 이용자 권리</h2>
          <ul>
            <li>개인정보 열람, 정정, 삭제 요청은 프로필 페이지에서 직접 수행하거나 이메일로 요청할 수 있습니다.</li>
            <li>계정 삭제 시 모든 개인정보는 즉시 파기됩니다.</li>
            <li>만 14세 미만 아동의 경우 법정대리인의 동의가 필요합니다.</li>
          </ul>

          <h2>8. 쿠키(Cookie) 사용</h2>
          <p>
            NodeBloom은 로그인 세션 유지를 위해 필수 쿠키를 사용합니다.
            분석 또는 마케팅 목적의 쿠키는 사용하지 않습니다.
          </p>

          <h2>9. 개인정보 보호책임자</h2>
          <p>
            개인정보 처리에 관한 문의는 아래 연락처로 해주세요.
          </p>
          <ul>
            <li>서비스명: NodeBloom</li>
            <li>이메일: privacy@nodebloom.app</li>
          </ul>

          <h2>10. 방침 변경</h2>
          <p>
            이 개인정보처리방침은 법령·정책 변경에 따라 수정될 수 있으며,
            변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </div>

        <div className="mt-12 border-t pt-4 text-center text-xs text-gray-400 dark:border-gray-800">
          <Link href="/terms" className="hover:underline">이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="hover:underline">홈으로</Link>
        </div>
      </div>
    </div>
  )
}
