import { SCORE_LABELS, SCORE_MAX, SCORE_MIN } from '@/utils/score'

/** 화면 전반에 쓰는 점수 척도 안내 */
export function ScoreScaleLegend({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      점수 {SCORE_MIN}~{SCORE_MAX} · <span className="font-medium text-slate-700">{SCORE_MAX}에 가까울수록
      좋음</span>
      {' '}
      ({SCORE_LABELS[1]} → {SCORE_LABELS[5]})
    </p>
  )
}
