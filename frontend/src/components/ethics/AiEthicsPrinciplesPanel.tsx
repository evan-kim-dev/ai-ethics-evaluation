import { Card } from '@/components/ui/card'
import { AI_ETHICS_PRINCIPLES } from '@/utils/ethicsPrinciples'

export function AiEthicsPrinciplesPanel() {
  return (
    <Card>
      <h3 className="mb-1 text-base font-semibold">AI 윤리 원칙</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        「대한민국 인공지능 윤리원칙」 및 연구 매핑에 따른 실천 기준
      </p>
      <div className="space-y-3">
        {AI_ETHICS_PRINCIPLES.map((p) => (
          <div key={p.key} className="rounded-lg border border-orange-200 bg-orange-50/40 p-3">
            <p className="font-medium text-orange-950">{p.label}</p>
            <p className="mt-1 text-sm text-slate-700">{p.description}</p>
            <p className="mt-1 text-sm text-slate-800">
              <span className="font-medium">이 질문에서 AI가 해야 할 행동: </span>
              {p.actions}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">관련 루브릭: {p.rubric.join(', ')}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
