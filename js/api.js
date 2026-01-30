죄송합니다! 두 군데 수정해야 해요:

---

## 1. Google Cloud 프록시 (`index.js`)

환경변수에서 API 키를 읽도록 수정:

```javascript
const functions = require('@google-cloud/functions-framework');

functions.http('claudeProxy', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const body = req.body;
    const provider = body.provider || 'claude';

    let response;

    if (provider === 'gpt') {
      // OpenAI GPT - 환경변수에서 키 사용
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: body.model || 'gpt-4o-mini',
          max_tokens: body.max_tokens || 2000,
          messages: body.messages
        })
      });
    } else {
      // Anthropic Claude - 환경변수에서 키 사용
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: body.model || 'claude-3-haiku-20240307',
          max_tokens: body.max_tokens || 2000,
          messages: body.messages
        })
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 2. Google Cloud에 환경변수 등록

1. Google Cloud Console → **Cloud Run** (또는 Cloud Functions)
2. `claude-proxy` 서비스 클릭
3. **수정 및 새 버전 배포** (Edit & Deploy New Revision)
4. **변수 및 보안 비밀** 탭
5. 환경변수 추가:
   - `OPENAI_API_KEY` = `sk-...` (GPT 키)
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (Claude 키, 있으면)

---

## 3. 앱 코드 (`js/api.js`)

API 키를 보내지 않도록 수정 - 새 파일 드릴게요:
