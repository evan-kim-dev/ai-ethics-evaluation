import { Badge } from '@/components/ui/badge'
import type { EthicalEvidenceItem } from '@/utils/ethicalInterpretation'

export function EthicalEvidenceList({ items }: { items: EthicalEvidenceItem[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">윤리 원칙 반영 근거</p>
      {items.slice(0, 6).map((item) => (
        <div
          key={`${item.rubric}-${item.label}`}
          className={`rounded-md border px-2.5 py-2 text-xs ${
            item.status === 'met'
              ? 'border-green-200 bg-green-50'
              : item.status === 'partial'
                ? 'border-amber-200 bg-amber-50'
                : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="mb-1 flex flex-wrap gap-1">
            <Badge className="border-transparent bg-white/80">[{item.status === 'met' ? '충족' : item.status === 'partial' ? '부분' : '부족'}]</Badge>
            <Badge className="border-transparent bg-white/80">[{item.rubric}]</Badge>
            <Badge className="border-transparent bg-white/80">[{item.framework}]</Badge>
          </div>
          <p className="font-medium">{item.label}</p>
          <p className="mt-0.5 text-slate-700">{item.text}</p>
        </div>
      ))}
    </div>
  )
}
