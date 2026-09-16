/** 배포 없이 카톡/메일로 보낼 수 있는 단일 질문 평가용 HTML */

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildOfflineRatingHtml(input: {
  questionId: number
  questionText: string
  baselineResponse: string
}): string {
  const q = escapeHtml(input.questionText)
  const a = escapeHtml(input.baselineResponse)
  const qid = input.questionId

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Baseline 별점 평가 #${qid}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif;
      background: #f7f8fa; color: #191f28; line-height: 1.55;
    }
    .wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 48px; }
    .card {
      background: #fff; border: 1px solid #e5e8eb; border-radius: 20px;
      padding: 18px; margin-bottom: 14px;
    }
    h1 { font-size: 1.25rem; margin: 0 0 6px; }
    .muted { color: #8b95a1; font-size: 0.875rem; }
    .label { font-size: 0.8rem; font-weight: 700; color: #3182f6; margin-bottom: 8px; }
    .box {
      white-space: pre-wrap; background: #f2f4f6; border-radius: 14px;
      padding: 14px; font-size: 0.95rem;
    }
    .stars { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
    .stars button {
      border: 1px solid #e5e8eb; background: #fff; border-radius: 999px;
      padding: 8px 12px; font-weight: 700; cursor: pointer;
    }
    .stars button.active { background: #3182f6; color: #fff; border-color: #3182f6; }
    textarea, input {
      width: 100%; border: none; background: #f2f4f6; border-radius: 14px;
      padding: 12px 14px; font: inherit; outline: none;
    }
    textarea:focus, input:focus { box-shadow: 0 0 0 4px rgba(49,130,246,.12); background: #fff; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .btn {
      border: none; border-radius: 14px; padding: 12px 16px; font-weight: 700;
      cursor: pointer; background: #3182f6; color: #fff;
    }
    .btn.secondary { background: #e8f1fe; color: #3182f6; }
    .ok { margin-top: 10px; color: #03b26c; font-size: 0.875rem; font-weight: 600; display: none; }
    .preview {
      margin-top: 12px; white-space: pre-wrap; background: #191f28; color: #fff;
      border-radius: 14px; padding: 12px; font-size: 0.8rem; display: none;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Baseline 응답 별점 평가</h1>
      <p class="muted">질문 #${qid} · 로그인 없이 평가한 뒤 아래 결과를 복사해 연구자에게 보내 주세요.</p>
    </div>

    <div class="card">
      <div class="label">질문</div>
      <div class="box">${q}</div>
    </div>

    <div class="card">
      <div class="label">AI Baseline 응답</div>
      <div class="box">${a}</div>
    </div>

    <div class="card">
      <div class="label">별점 (1.0 ~ 5.0, 0.5 단위)</div>
      <div class="stars" id="stars"></div>
      <p class="muted">선택: <strong id="scoreLabel">3.0</strong>점</p>

      <div style="margin-top:14px">
        <div class="label">평가자 이름/닉네임</div>
        <input id="evaluator" placeholder="예: 김연구" />
      </div>
      <div style="margin-top:14px">
        <div class="label">코멘트 (선택)</div>
        <textarea id="note" rows="4" placeholder="이 응답이 왜 좋은지/아쉬운지 짧게"></textarea>
      </div>

      <div class="actions">
        <button class="btn" type="button" id="copyBtn">결과 문구 복사</button>
        <button class="btn secondary" type="button" id="mailBtn">메일로 보내기</button>
      </div>
      <p class="ok" id="ok">복사되었습니다. 카톡/메일로 붙여넣어 보내 주세요.</p>
      <pre class="preview" id="preview"></pre>
    </div>
  </div>

  <script>
    let score = 3.0;
    const stars = document.getElementById('stars');
    const scoreLabel = document.getElementById('scoreLabel');
    for (let s = 1; s <= 5; s += 0.5) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.toFixed(1);
      b.dataset.value = String(s);
      if (s === 3) b.classList.add('active');
      b.onclick = () => {
        score = s;
        scoreLabel.textContent = s.toFixed(1);
        [...stars.children].forEach((el) => el.classList.toggle('active', Number(el.dataset.value) === s));
      };
      stars.appendChild(b);
    }

    function buildText() {
      const evaluator = (document.getElementById('evaluator').value || '익명').trim();
      const note = (document.getElementById('note').value || '').trim();
      return [
        '[Baseline 별점 평가 결과]',
        '질문 ID: ${qid}',
        '평가자: ' + evaluator,
        '별점: ' + score.toFixed(1),
        '코멘트: ' + (note || '(없음)'),
      ].join('\\n');
    }

    document.getElementById('copyBtn').onclick = async () => {
      const text = buildText();
      document.getElementById('preview').style.display = 'block';
      document.getElementById('preview').textContent = text;
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById('ok').style.display = 'block';
      } catch (e) {
        document.getElementById('ok').style.display = 'block';
        document.getElementById('ok').textContent = '복사에 실패했습니다. 아래 미리보기를 직접 선택해 복사하세요.';
        document.getElementById('ok').style.color = '#f04452';
      }
    };

    document.getElementById('mailBtn').onclick = () => {
      const text = buildText();
      const subject = encodeURIComponent('Baseline 별점 평가 #${qid}');
      const body = encodeURIComponent(text);
      location.href = 'mailto:?subject=' + subject + '&body=' + body;
    };
  </script>
</body>
</html>`
}

export function downloadOfflineRatingHtml(input: {
  questionId: number
  questionText: string
  baselineResponse: string
}): void {
  const html = buildOfflineRatingHtml(input)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `baseline-rating-q${input.questionId}.html`
  a.click()
  URL.revokeObjectURL(url)
}
