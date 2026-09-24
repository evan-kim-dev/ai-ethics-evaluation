import shareCopy from '@/config/share-copy.json'

export type ShareCopy = typeof shareCopy

export function getShareCopy(): ShareCopy {
  return shareCopy
}

export function buildKakaoInvite({
  shareUrl,
  evaluatorId,
  password,
}: {
  shareUrl: string
  evaluatorId: string
  password: string
}): string {
  const { kakao } = shareCopy
  return [
    '━━━━━━━━━━━━━━━━',
    kakao.heading,
    '━━━━━━━━━━━━━━━━',
    '',
    ...kakao.intro,
    '',
    `▶ ${kakao.linkLabel}`,
    shareUrl,
    '',
    `▶ ${kakao.idLabel}`,
    evaluatorId,
    '',
    `▶ ${kakao.passwordLabel}`,
    password,
    '',
    ...kakao.notes.map((note) => `• ${note}`),
    '━━━━━━━━━━━━━━━━',
  ].join('\n')
}
