'use client'

import { Award, Printer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Certificate } from '@/actions/certificate'

interface Props {
  certificates: Certificate[]
  studentName: string
}

/**
 * 인증서 HTML 생성 + 인쇄 창 열기.
 * PDF는 브라우저 기본 "PDF로 저장" 기능 활용.
 */
function openPrintableCertificate(cert: Certificate, studentName: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1100')
  if (!printWindow) return

  const issuedDate = new Date(cert.issued_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${cert.tree_title} - 수료 인증서</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    background: #f8fafc;
    padding: 40px 20px;
    min-height: 100vh;
  }
  .cert {
    max-width: 820px;
    margin: 0 auto;
    background: white;
    border: 3px double #4F6BF6;
    padding: 60px 50px;
    position: relative;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }
  .cert::before, .cert::after {
    content: '';
    position: absolute;
    inset: 12px;
    border: 1px solid #7C5CFC;
    pointer-events: none;
  }
  .logo {
    text-align: center;
    font-size: 20px;
    font-weight: 800;
    color: #4F6BF6;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .logo .accent { color: #7C5CFC; }
  .title {
    text-align: center;
    font-size: 44px;
    font-weight: 900;
    color: #1f2937;
    letter-spacing: 8px;
    margin: 30px 0 10px;
  }
  .subtitle {
    text-align: center;
    color: #6b7280;
    font-size: 13px;
    letter-spacing: 2px;
  }
  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent, #4F6BF6, transparent);
    margin: 36px auto;
    width: 60%;
  }
  .recipient {
    text-align: center;
    font-size: 15px;
    color: #4b5563;
    margin-bottom: 16px;
  }
  .name {
    text-align: center;
    font-size: 42px;
    font-weight: 800;
    color: #4F6BF6;
    margin: 12px 0 24px;
    padding: 0 40px;
    border-bottom: 2px solid #e5e7eb;
    display: inline-block;
    margin-left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .body-text {
    text-align: center;
    font-size: 15px;
    line-height: 1.9;
    color: #374151;
    margin: 30px 50px;
  }
  .course {
    display: inline-block;
    background: linear-gradient(135deg, #4F6BF6, #7C5CFC);
    color: white;
    padding: 6px 20px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 16px;
    margin: 4px 0;
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin: 40px 0;
  }
  .stat {
    text-align: center;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 800;
    color: #4F6BF6;
  }
  .stat-label {
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .footer {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 30px;
  }
  .date-block, .teacher-block {
    text-align: center;
    font-size: 12px;
    color: #6b7280;
  }
  .date-block .value, .teacher-block .value {
    font-size: 16px;
    color: #1f2937;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .seal {
    width: 90px;
    height: 90px;
    border: 3px solid #EF4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #EF4444;
    font-weight: 900;
    font-size: 11px;
    transform: rotate(-8deg);
    text-align: center;
    line-height: 1.2;
    background: rgba(239, 68, 68, 0.03);
  }
  @media print {
    body { padding: 0; background: white; }
    .cert { border: 3px double #4F6BF6; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="cert">
    <div class="logo">Node<span class="accent">Bloom</span></div>
    <h1 class="title">CERTIFICATE</h1>
    <p class="subtitle">OF COMPLETION · 수료 인증서</p>
    <div class="divider"></div>
    <p class="recipient">이 증서는 다음 학습자에게 수여합니다</p>
    <div style="text-align: center;">
      <span class="name">${escapeHtml(studentName)}</span>
    </div>
    <p class="body-text">
      위 학생은 NodeBloom AI 기반 학습 플랫폼에서<br />
      <span class="course">${escapeHtml(cert.tree_title)}</span><br />
      과정을 성공적으로 수료하였음을 인증합니다.
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${cert.node_count}</div>
        <div class="stat-label">NODES</div>
      </div>
      <div class="stat">
        <div class="stat-value">${cert.avg_score}</div>
        <div class="stat-label">AVG SCORE</div>
      </div>
      <div class="stat">
        <div class="stat-value">100%</div>
        <div class="stat-label">COMPLETED</div>
      </div>
    </div>
    <div class="footer">
      <div class="date-block">
        <div class="value">${issuedDate}</div>
        <div>발급일</div>
      </div>
      <div class="seal">NODE<br/>BLOOM<br/>SEAL</div>
      <div class="teacher-block">
        <div class="value">${escapeHtml(cert.teacher_name ?? '—')}</div>
        <div>담당 교사</div>
      </div>
    </div>
  </div>
  <script>setTimeout(() => window.print(), 500);</script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

function escapeHtml(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function MyCertificatesCard({ certificates, studentName }: Props) {
  if (certificates.length === 0) return null

  return (
    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-yellow-600" />
          내 수료 인증서 ({certificates.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {certificates.map(cert => (
            <li
              key={cert.id}
              className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{cert.tree_title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {cert.node_count}개 노드 · 평균 {cert.avg_score}점
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(cert.issued_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPrintableCertificate(cert, studentName)}
              >
                <Printer className="mr-1 h-3 w-3" />
                다운로드
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
