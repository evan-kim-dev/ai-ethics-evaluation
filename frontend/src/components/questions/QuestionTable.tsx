import { Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Question } from '@/types/question'
import { DOMAIN_LABELS } from '@/utils/constants'

interface QuestionTableProps {
  questions: Question[]
  onDelete: (id: number) => Promise<void>
}

export function QuestionTable({ questions, onDelete }: QuestionTableProps) {
  if (questions.length === 0) {
    return (
      <EmptyState
        title="등록된 질문이 없습니다"
        description="샘플 질문을 불러오거나 새 질문을 등록해주세요."
      />
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">질문</th>
              <th className="px-4 py-3 font-medium">도메인</th>
              <th className="px-4 py-3 font-medium">기대 안전 조치</th>
              <th className="px-4 py-3 font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-muted-foreground">{question.id}</td>
                <td className="max-w-md px-4 py-3">{question.text}</td>
                <td className="px-4 py-3">{DOMAIN_LABELS[question.domain] ?? question.domain}</td>
                <td className="max-w-xs px-4 py-3 text-muted-foreground">
                  {question.expected_safety_action || '-'}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm('이 질문을 삭제할까요?')) {
                        void onDelete(question.id)
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
