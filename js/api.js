// ===== DAYOUNG's 통번역 스튜디오 v3 - API Module =====

const API = {
    // Google Cloud 프록시 URL
    PROXY_URL: 'https://claude-proxy-957117035071.us-central1.run.app',
    
    // GPT 호출 (gpt-5-mini)
    async callGPT(prompt, systemPrompt = '') {
        const response = await fetch(this.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'gpt',
                model: 'gpt-5-mini',
                max_tokens: 2000,
                messages: [
                    { role: 'system', content: systemPrompt || '당신은 한영/영한 번역 전문가입니다.' },
                    { role: 'user', content: prompt }
                ]
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'GPT API 오류');
        }
        const data = await response.json();
        return data.choices[0].message.content;
    },
    
    // Claude 프리미엄 호출 (claude-sonnet-4)
    async callClaude(prompt, systemPrompt = '') {
        const response = await fetch(this.PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'claude',
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [
                    { role: 'user', content: (systemPrompt || '당신은 한영/영한 번역 전문가입니다.') + '\n\n' + prompt }
                ]
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API 오류');
        }
        const data = await response.json();
        return data.content[0].text;
    },
    
    // 번역 첨삭 요청 (모델 선택 가능)
    async getTranslationFeedback(original, userTranslation, direction = 'en-ko', usePremium = false) {
        const sourceLang = direction === 'en-ko' ? '영어' : '한국어';
        const targetLang = direction === 'en-ko' ? '한국어' : '영어';
        
        const prompt = `당신은 통번역대학원 수준의 엄격한 번역 평가 전문가입니다.

## 평가 대상
- 원문 (${sourceLang}): "${original}"
- 학습자 번역 (${targetLang}): "${userTranslation}"

## 평가 기준 (통번역대학원 수준)
1. **정확성 (40점)**: 원문의 의미가 정확히 전달되었는가? 오역, 누락, 첨가가 없는가?
2. **자연스러움 (30점)**: 목표 언어의 자연스러운 표현인가? 번역체가 아닌가?
3. **용어 선택 (20점)**: 문맥에 적합한 어휘/용어를 사용했는가?
4. **문체 일관성 (10점)**: 원문의 톤과 스타일이 유지되었는가?

## 엄격한 평가 지침
- 70점 이하: 오역이나 심각한 문제가 있음
- 70-79점: 의미는 전달되나 개선 필요
- 80-89점: 양호하나 세부 표현 개선 여지 있음
- 90점 이상: 전문가 수준의 우수한 번역

다음 JSON 형식으로만 응답하세요:
{
  "score": 0-100,
  "feedback": "전체 평가 (2-3문장)",
  "improvements": ["구체적 개선점1", "구체적 개선점2", "구체적 개선점3"],
  "goodPoints": ["잘한 점1", "잘한 점2"],
  "modelAnswer": "모범 번역 (자연스럽고 정확한 번역)"
}`;

        try {
            const response = usePremium 
                ? await this.callClaude(prompt)
                : await this.callGPT(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('응답 파싱 실패');
        } catch (error) {
            console.error('Feedback error:', error);
            return {
                score: 0,
                feedback: 'AI 첨삭을 가져올 수 없습니다: ' + error.message,
                improvements: [],
                goodPoints: [],
                modelAnswer: ''
            };
        }
    },
    
    // 통역 평가 요청
    async getInterpretationFeedback(original, userInterpretation, direction = 'en-ko', usePremium = false) {
        const prompt = `당신은 통번역대학원 수준의 엄격한 통역 평가 전문가입니다.

## 평가 대상
- 원문: "${original}"
- 학습자 통역: "${userInterpretation}"

## 평가 기준
1. **완성도**: 내용 누락 없이 전달되었는가?
2. **정확성**: 의미가 정확히 전달되었는가?
3. **유창성**: 자연스럽게 표현되었는가?

다음 JSON 형식으로만 응답하세요:
{
  "score": 0-100,
  "feedback": "전체 평가 (유창성, 정확성, 완성도)",
  "missedPoints": ["누락된 내용1", "누락된 내용2"],
  "goodPoints": ["잘한 점1"],
  "modelInterpretation": "모범 통역"
}`;

        try {
            const response = usePremium 
                ? await this.callClaude(prompt)
                : await this.callGPT(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('응답 파싱 실패');
        } catch (error) {
            console.error('Interpretation feedback error:', error);
            return {
                score: 0,
                feedback: 'AI 평가를 가져올 수 없습니다: ' + error.message,
                missedPoints: [],
                goodPoints: [],
                modelInterpretation: ''
            };
        }
    },
    
    // 기사 생성 (gpt-5-mini 사용)
    async expandArticle(title, summary, category) {
        const categoryInfo = {
            economy: '경제/금융 (거시경제, 통화정책, 금융시장, 기업 실적)',
            politics: '국제정치/외교 (외교, 안보, 국제관계, 정상회담)',
            law: '법률/규제 (국제법, 통상법, 규제 정책)',
            health: '의료/보건 (공중보건, 의료정책, 신약 개발)',
            tech: '기술/IT (AI, 반도체, 디지털 전환, 스타트업)'
        };
        
        const prompt = `당신은 Reuters, Bloomberg 수준의 전문 뉴스 기자입니다.

## 작성 요청
- 제목: ${title}
- 요약: ${summary}
- 분야: ${categoryInfo[category] || category}

## 작성 지침
1. 통번역사 학습에 적합한 전문적이고 격식있는 영어로 작성
2. 350-450단어 분량
3. 리드문 → 본문 → 전문가 인용 → 전망 순으로 구성
4. 통번역사 시험에 자주 나오는 고급 어휘와 표현 사용
5. 구체적인 수치, 날짜, 인물명 포함

다음 JSON 형식으로 응답하세요:
{
  "content": "영어 기사 본문 (350-450단어)",
  "level": "intermediate|advanced|expert",
  "keyTerms": [
    {"en": "전문용어1", "ko": "한국어번역1"},
    {"en": "전문용어2", "ko": "한국어번역2"},
    {"en": "전문용어3", "ko": "한국어번역3"},
    {"en": "전문용어4", "ko": "한국어번역4"},
    {"en": "전문용어5", "ko": "한국어번역5"}
  ]
}`;

        try {
            const response = await this.callGPT(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('기사 생성 실패');
        } catch (error) {
            console.error('Article expansion error:', error);
            return null;
        }
    },
    
    // GitHub Actions 트리거 (기사 업데이트)
    async triggerArticleUpdate(githubToken, owner, repo) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${githubToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event_type: 'update-articles'
                    })
                }
            );
            return response.ok;
        } catch (error) {
            console.error('GitHub trigger error:', error);
            return false;
        }
    }
};

// ===== TTS (Text-to-Speech) - 토글 기능 추가 =====
const TTS = {
    speaking: false,
    
    speak(text, lang = 'en-US', rate = 0.9) {
        // 토글: 재생 중이면 정지
        if (this.speaking) {
            this.stop();
            return;
        }
        
        this.stop();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.onstart = () => { this.speaking = true; };
        utterance.onend = () => { this.speaking = false; };
        utterance.onerror = () => { this.speaking = false; };
        speechSynthesis.speak(utterance);
    },
    
    stop() { 
        speechSynthesis.cancel(); 
        this.speaking = false; 
    },
    
    isSpeaking() { return this.speaking; }
};

// ===== STT (Speech-to-Text) =====
const STT = {
    recognition: null,
    isListening: false,
    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            return true;
        }
        return false;
    },
    start(lang = 'ko-KR', onResult, onEnd) {
        if (!this.recognition && !this.init()) { alert('음성 인식 미지원'); return; }
        this.recognition.lang = lang;
        this.recognition.onresult = (e) => { const t = Array.from(e.results).map(r => r[0].transcript).join(''); onResult(t, e.results[0].isFinal); };
        this.recognition.onend = () => { this.isListening = false; if (onEnd) onEnd(); };
        this.recognition.onerror = (e) => { console.error('STT Error:', e.error); this.isListening = false; };
        this.recognition.start();
        this.isListening = true;
    },
    stop() { if (this.recognition && this.isListening) { this.recognition.stop(); this.isListening = false; } }
};

// ===== BGM =====
const BGM = {
    audio: null, currentTrack: null,
    tracks: {
        lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        jazz: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c5.mp3',
        nature: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
        rain: 'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea70ad08cb.mp3',
        piano: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3'
    },
    play(t) { if (this.audio) this.audio.pause(); const u = this.tracks[t]; if (!u) return; this.audio = new Audio(u); this.audio.loop = true; this.audio.volume = 0.3; this.currentTrack = t; this.audio.play().catch(e => {}); },
    stop() { if (this.audio) { this.audio.pause(); this.audio = null; this.currentTrack = null; } },
    setVolume(v) { if (this.audio) this.audio.volume = v / 100; },
    isPlaying() { return this.audio && !this.audio.paused; }
};
