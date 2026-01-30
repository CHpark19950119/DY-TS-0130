// ===== DAYOUNG's 통번역 스튜디오 v3 - API Module =====

const API = {
    // Google Cloud 프록시 URL
    PROXY_URL: 'https://claude-proxy-957117035071.us-central1.run.app',
    
    // GPT 호출 (gpt-4o-mini)
    async callGPT(prompt, systemPrompt = '') {
        try {
            const response = await fetch(this.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'gpt',
                    model: 'gpt-4o-mini',
                    max_tokens: 3000,
                    messages: [
                        { role: 'system', content: systemPrompt || '당신은 통번역대학원 교수입니다.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            const data = await response.json();
            console.log('GPT Response:', data);
            
            // 에러 체크
            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            
            // 응답 형식 체크
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('Unexpected GPT response format:', data);
                throw new Error('GPT 응답 형식 오류: ' + JSON.stringify(data).substring(0, 200));
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.error('callGPT error:', error);
            throw error;
        }
    },
    
    // Claude 프리미엄 호출 (claude-sonnet-4)
    async callClaude(prompt, systemPrompt = '') {
        try {
            const response = await fetch(this.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'claude',
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 3000,
                    messages: [
                        { role: 'user', content: (systemPrompt || '당신은 통번역대학원 교수입니다.') + '\n\n' + prompt }
                    ]
                })
            });
            
            const data = await response.json();
            console.log('Claude Response:', data);
            
            // 에러 체크
            if (data.error) {
                throw new Error(data.error.message || JSON.stringify(data.error));
            }
            
            // 응답 형식 체크
            if (!data.content || !data.content[0] || !data.content[0].text) {
                console.error('Unexpected Claude response format:', data);
                throw new Error('Claude 응답 형식 오류: ' + JSON.stringify(data).substring(0, 200));
            }
            
            return data.content[0].text;
        } catch (error) {
            console.error('callClaude error:', error);
            throw error;
        }
    },
    
    // 번역 첨삭 요청 (모델 선택 가능) - 매우 상세한 프롬프트
    async getTranslationFeedback(original, userTranslation, direction = 'en-ko', usePremium = false) {
        const sourceLang = direction === 'en-ko' ? '영어' : '한국어';
        const targetLang = direction === 'en-ko' ? '한국어' : '영어';
        
        const prompt = `당신은 통번역대학원 교수로서 학생의 번역을 엄격하고 상세하게 첨삭합니다.

═══════════════════════════════════════════
📝 평가 대상
═══════════════════════════════════════════
【원문 (${sourceLang})】
"${original}"

【학습자 번역 (${targetLang})】
"${userTranslation}"

═══════════════════════════════════════════
📊 평가 기준 (100점 만점)
═══════════════════════════════════════════
1. 정확성 (35점)
   - 오역(mistranslation): 의미가 잘못 전달된 부분
   - 누락(omission): 원문의 내용 중 빠진 부분  
   - 첨가(addition): 원문에 없는 내용이 추가된 부분
   
2. 자연스러움 (25점)
   - 번역투(translationese): 어색한 직역체 표현
   - 어순/문장 구조: 목표 언어에 맞는 자연스러운 어순
   - 연어(collocation): 자연스러운 단어 조합
   
3. 용어 선택 (20점)
   - 문맥 적합성: 해당 분야에 맞는 적절한 용어
   - 일관성: 같은 개념에 일관된 번역어 사용
   - 뉘앙스: 원문의 tone/register 반영
   
4. 문체/스타일 (20점)
   - 격식체/비격식체 일치
   - 문장 길이 및 복잡도 적절성
   - 전체적인 가독성

═══════════════════════════════════════════
⚠️ 평가 지침
═══════════════════════════════════════════
- 50점 이하: 심각한 오역, 의미 전달 실패
- 51-65점: 기본 의미는 전달되나 여러 문제
- 66-75점: 양호하나 개선 필요
- 76-85점: 좋음, 세부 표현 개선 여지
- 86-95점: 매우 좋음, 전문가 수준
- 96-100점: 완벽에 가까움

═══════════════════════════════════════════
📋 응답 형식 (JSON)
═══════════════════════════════════════════
다음 JSON 형식으로만 응답하세요:
{
  "score": 점수(0-100),
  "feedback": "종합 평가 (3-4문장으로 전체적인 번역의 질과 주요 문제점 설명)",
  "analysis": {
    "accuracy": "정확성 분석: 오역/누락/첨가 여부를 구체적으로 지적",
    "naturalness": "자연스러움 분석: 번역투나 어색한 표현 지적",
    "terminology": "용어 분석: 부적절한 용어 선택 지적",
    "style": "문체 분석: 스타일 관련 문제점"
  },
  "improvements": [
    "【구체적 개선점 1】 '학습자가 쓴 표현' → '더 나은 표현' (이유 설명)",
    "【구체적 개선점 2】 '학습자가 쓴 표현' → '더 나은 표현' (이유 설명)",
    "【구체적 개선점 3】 '학습자가 쓴 표현' → '더 나은 표현' (이유 설명)"
  ],
  "goodPoints": [
    "잘한 점 1 (구체적인 표현 언급)",
    "잘한 점 2 (구체적인 표현 언급)"
  ],
  "modelAnswer": "모범 번역 (자연스럽고 정확한 전문가 수준의 번역)"
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
                analysis: {},
                improvements: [],
                goodPoints: [],
                modelAnswer: ''
            };
        }
    },
    
    // 통역 평가 요청
    async getInterpretationFeedback(original, userInterpretation, direction = 'en-ko', usePremium = false) {
        const prompt = `당신은 통번역대학원 교수로서 학생의 통역을 엄격하게 평가합니다.

【원문】
"${original}"

【학습자 통역】
"${userInterpretation}"

다음 JSON 형식으로만 응답하세요:
{
  "score": 0-100,
  "feedback": "전체 평가 (유창성, 정확성, 완성도를 3-4문장으로)",
  "missedPoints": ["누락된 내용 1", "누락된 내용 2"],
  "goodPoints": ["잘한 점 1", "잘한 점 2"],
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
    
    // 기사 생성 (gpt-5-mini)
    async expandArticle(title, summary, category) {
        const categoryInfo = {
            economy: '경제/금융',
            politics: '국제정치/외교',
            law: '법률/규제',
            health: '의료/보건',
            tech: '기술/IT'
        };
        
        const prompt = `You are a Reuters/Bloomberg professional journalist.

Write a 350-450 word English news article for translation practice.

Title: ${title}
Summary: ${summary}
Category: ${categoryInfo[category] || category}

Requirements:
1. Formal journalistic English
2. Include specific numbers, dates, expert quotes
3. Structure: Lead → Body → Expert quote → Outlook
4. Use advanced vocabulary for translation exams

Respond with JSON only:
{
  "content": "Full article (350-450 words)",
  "koreanContent": "같은 내용의 한국어 번역 (통번역 학습용)",
  "level": "intermediate|advanced|expert",
  "keyTerms": [
    {"en": "term1", "ko": "용어1"},
    {"en": "term2", "ko": "용어2"},
    {"en": "term3", "ko": "용어3"},
    {"en": "term4", "ko": "용어4"},
    {"en": "term5", "ko": "용어5"}
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
    
    // GitHub Actions 트리거
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
                    body: JSON.stringify({ event_type: 'update-articles' })
                }
            );
            return response.ok || response.status === 204;
        } catch (error) {
            console.error('GitHub trigger error:', error);
            return false;
        }
    }
};

// ===== TTS (토글 기능) =====
const TTS = {
    speaking: false,
    
    speak(text, lang = 'en-US', rate = 0.9) {
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

// ===== STT =====
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
        this.recognition.onresult = (e) => { 
            const t = Array.from(e.results).map(r => r[0].transcript).join(''); 
            onResult(t, e.results[0].isFinal); 
        };
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
    play(t) { 
        if (this.audio) this.audio.pause(); 
        const u = this.tracks[t]; 
        if (!u) return; 
        this.audio = new Audio(u); 
        this.audio.loop = true; 
        this.audio.volume = 0.3; 
        this.currentTrack = t; 
        this.audio.play().catch(e => {}); 
    },
    stop() { if (this.audio) { this.audio.pause(); this.audio = null; this.currentTrack = null; } },
    setVolume(v) { if (this.audio) this.audio.volume = v / 100; },
    isPlaying() { return this.audio && !this.audio.paused; }
};
