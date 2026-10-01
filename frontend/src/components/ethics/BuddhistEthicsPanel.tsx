import { Card } from '@/components/ui/card'
import { BUDDHIST_ETHICS } from '@/utils/ethicsPrinciples'

export function BuddhistEthicsPanel() {
  return (
    <Card>
      <h3 className="mb-1 text-base font-semibold">윤리 위 행동 보강 (연기·자비·무아)</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        「대한민국 인공지능 윤리원칙」이 기본 프레임입니다. 아래는 그 위에 더하는 응답 행동이며,
        불교가 윤리원칙보다 우월하다는 뜻이 아닙니다. B1–B3는 S에 합산하지 않습니다.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {BUDDHIST_ETHICS.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-purple-200 bg-purple-50/50 p-3"
          >
            <p className="font-semibold text-purple-900">{item.label}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {item.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              대응 루브릭: {item.rubric.join(', ')}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
