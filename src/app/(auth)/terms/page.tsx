import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LogoSymbol } from '@/components/Logo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <LogoSymbol size={32} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">이용약관</h1>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-gray-500">최종 수정일: 2026년 4월 10일</p>

          <h2>제1조 (목적)</h2>
          <p>
            이 약관은 NodeBloom(이하 &ldquo;서비스&rdquo;)이 제공하는 AI 기반 교육 플랫폼의 이용 조건 및 절차,
            이용자와 서비스 간의 권리·의무를 규정함을 목적으로 합니다.
          </p>

          <h2>제2조 (정의)</h2>
          <ol>
            <li>&ldquo;서비스&rdquo;란 NodeBloom이 제공하는 스킬트리 기반 학습 관리, AI 퀴즈 생성, 학습 분석 등 일체의 온라인 교육 서비스를 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 이 약관에 동의하고 서비스를 이용하는 교사, 학생, 학부모, 운영자를 말합니다.</li>
            <li>&ldquo;콘텐츠&rdquo;란 이용자가 서비스에 업로드하거나 AI가 생성한 스킬트리, 퀴즈, 학습 문서 등을 말합니다.</li>
          </ol>

          <h2>제3조 (약관의 효력 및 변경)</h2>
          <ol>
            <li>이 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>서비스는 합리적 사유가 발생한 경우 이 약관을 변경할 수 있으며, 변경 시 7일 전에 공지합니다.</li>
          </ol>

          <h2>제4조 (계정 관리)</h2>
          <ol>
            <li>이용자는 정확한 정보를 제공하여 회원가입해야 합니다.</li>
            <li>계정 정보의 관리 책임은 이용자에게 있으며, 타인에게 양도하거나 공유할 수 없습니다.</li>
            <li>이용자는 언제든지 계정을 삭제할 수 있으며, 삭제 시 모든 데이터는 영구적으로 제거됩니다.</li>
          </ol>

          <h2>제5조 (서비스 이용)</h2>
          <ol>
            <li>서비스는 교육 목적으로만 이용해야 합니다.</li>
            <li>이용자는 서비스를 이용하여 불법적이거나 부적절한 콘텐츠를 생성·배포할 수 없습니다.</li>
            <li>서비스의 AI 기능은 교육 보조 도구이며, 전문적인 교육 자문을 대체하지 않습니다.</li>
          </ol>

          <h2>제6조 (콘텐츠 저작권)</h2>
          <ol>
            <li>이용자가 업로드한 원본 콘텐츠의 저작권은 이용자에게 귀속됩니다.</li>
            <li>AI가 생성한 콘텐츠(스킬트리, 퀴즈, 학습 문서 등)는 서비스 내에서 자유롭게 이용할 수 있으나, 상업적 재배포는 금지됩니다.</li>
            <li>서비스는 이용자 콘텐츠를 서비스 개선 목적으로 활용할 수 있습니다.</li>
          </ol>

          <h2>제7조 (서비스 중단)</h2>
          <p>
            서비스는 시스템 점검, 장비 교체, 천재지변, 기타 불가피한 사유로 일시적으로 중단될 수 있습니다.
            이 경우 사전에 공지하며, 예측 불가능한 상황에서는 사후 공지합니다.
          </p>

          <h2>제8조 (면책)</h2>
          <ol>
            <li>서비스는 AI 생성 콘텐츠의 정확성을 보장하지 않습니다. 학습 결과에 대한 최종 판단은 이용자의 책임입니다.</li>
            <li>이용자 간 분쟁에 대해 서비스는 개입하지 않으며 책임을 지지 않습니다.</li>
            <li>무료 서비스 기간 중 발생한 데이터 손실에 대해 보상하지 않습니다.</li>
          </ol>

          <h2>제9조 (분쟁 해결)</h2>
          <p>
            이 약관에 관한 분쟁은 대한민국 법률을 적용하며, 관할 법원은 서울중앙지방법원으로 합니다.
          </p>
        </div>

        <div className="mt-12 border-t pt-4 text-center text-xs text-gray-400 dark:border-gray-800">
          <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="hover:underline">홈으로</Link>
        </div>
      </div>
    </div>
  )
}
