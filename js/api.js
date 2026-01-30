// ===== DAYOUNG's 통번역 스튜디오 v3 - API Module =====

const API = {
    // AI 모델 엔드포인트
    ENDPOINTS: {
        claude: 'https://api.anthropic.com/v1/messages',
        gpt: 'https://api.openai.com/v1/chat/completions'
    },
    
    // 현재 선택된 모델로 AI 요청
    async callAI(prompt, systemPrompt = '') {
        const model = Storage.getAiModel();
        const apiKey = Storage.getApiKey(model);
        
        if (!apiKey) {
            throw new Error(`${model.toUpperCase()} API 키가 설정되지 않았습니다.`);
        }
        
        if (model === 'claude') {
            return this.callClaude(apiKey, prompt, systemPrompt);
        } else {
            return this.callGPT(apiKey, prompt, systemPrompt);
        }
    },
    
    // Claude API 호출
    async callClaude(apiKey, prompt, systemPrompt = '') {
        const response = await fetch(this.ENDPOINTS.claude, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                system: systemPrompt || '당신은 한영/영한 번역 전문가입니다. 친절하고 정확하게 피드백을 제공합니다.',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Claude API 오류');
        }
        
        const data = await response.json();
        return data.content[0].text;
    },
    
    // GPT API 호출
    async callGPT(apiKey, prompt, systemPrompt = '') {
        const response = await fetch(this.ENDPOINTS.gpt, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt || '당신은 한영/영한 번역 전문가입니다. 친절하고 정확하게 피드백을 제공합니다.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'GPT API 오류');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    },
    
    // 번역 첨삭 요청
    async getTranslationFeedback(original, userTranslation, direction = 'en-ko') {
        const directionText = direction === 'en-ko' 
            ? '영어 → 한국어' 
            : '한국어 → 영어';
        
        const prompt = `다음 번역을 평가해주세요.

[원문] (${direction === 'en-ko' ? '영어' : '한국어'})
${original}

[사용자 번역] (${direction === 'en-ko' ? '한국어' : '영어'})
${userTranslation}

다음 JSON 형식으로만 응답해주세요:
{
  "score": 0-100 사이의 점수,
  "feedback": "전체적인 피드백",
  "improvements": ["개선점1", "개선점2"],
  "goodPoints": ["잘한 점1", "잘한 점2"],
  "modelAnswer": "모범 번역"
}`;

        try {
            const response = await this.callAI(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('응답 파싱 실패');
        } catch (error) {
            console.error('Feedback error:', error);
            return {
                score: 70,
                feedback: 'AI 첨삭을 가져올 수 없습니다. API 키를 확인해주세요.',
                improvements: [],
                goodPoints: [],
                modelAnswer: ''
            };
        }
    },
    
    // 통역 평가 요청
    async getInterpretationFeedback(original, userInterpretation, direction = 'en-ko') {
        const prompt = `다음 통역을 평가해주세요.

[원문]
${original}

[사용자 통역]
${userInterpretation}

다음 JSON 형식으로만 응답해주세요:
{
  "score": 0-100 사이의 점수,
  "feedback": "전체적인 피드백 (유창성, 정확성, 완성도)",
  "missedPoints": ["누락된 내용1", "누락된 내용2"],
  "goodPoints": ["잘한 점1"],
  "modelInterpretation": "모범 통역"
}`;

        try {
            const response = await this.callAI(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('응답 파싱 실패');
        } catch (error) {
            console.error('Interpretation feedback error:', error);
            return {
                score: 70,
                feedback: 'AI 평가를 가져올 수 없습니다.',
                missedPoints: [],
                goodPoints: [],
                modelInterpretation: ''
            };
        }
    },
    
    // RSS에서 기사 가져오기 (프록시 필요)
    async fetchArticlesFromRSS() {
        // 참고: CORS 문제로 클라이언트에서 직접 RSS 호출은 어려움
        // GitHub Actions에서 처리하거나 프록시 서버 필요
        const feeds = [
            { url: 'https://feeds.reuters.com/reuters/businessNews', category: 'economy', source: 'Reuters' },
            { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'politics', source: 'BBC' }
        ];
        
        // 실제 구현시에는 프록시 서버나 서버리스 함수 사용
        return [];
    },
    
    // 기사 확장 (AI로 본문 생성)
    async expandArticle(title, summary, category) {
        const categoryInfo = {
            economy: '경제/금융 (거시경제, 통화정책, 금융시장)',
            politics: '국제정치/외교 (외교, 안보, 국제관계)',
            law: '법률/규제 (국제법, 통상법)',
            health: '의료/보건 (공중보건, 의료정책)',
            tech: '기술/IT (AI, 반도체, 디지털)'
        };
        
        const prompt = `다음 뉴스 헤드라인을 바탕으로 350-450단어의 영어 뉴스 기사를 작성해주세요.

제목: ${title}
요약: ${summary}
분야: ${categoryInfo[category] || category}

다음 JSON 형식으로 응답해주세요:
{
  "content": "영어 기사 본문 (350-450단어)",
  "level": "beginner|intermediate|advanced|expert",
  "keyTerms": [
    {"en": "영어용어1", "ko": "한국어번역1"},
    {"en": "영어용어2", "ko": "한국어번역2"}
  ]
}`;

        try {
            const response = await this.callAI(prompt);
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
    
    // 한영 버전 기사 생성
    async generateKoreanArticle(englishContent, keyTerms) {
        const prompt = `다음 영어 기사를 자연스러운 한국어로 번역해주세요. 통번역 학습용으로 사용됩니다.

[영어 원문]
${englishContent}

다음 JSON 형식으로 응답해주세요:
{
  "koreanContent": "한국어 번역문",
  "additionalTerms": [
    {"en": "추가영어용어", "ko": "한국어번역"}
  ]
}`;

        try {
            const response = await this.callAI(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('한국어 기사 생성 실패');
        } catch (error) {
            console.error('Korean article error:', error);
            return null;
        }
    }
};

// ===== TTS (Text-to-Speech) =====
const TTS = {
    speaking: false,
    
    speak(text, lang = 'en-US', rate = 0.9) {
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
    
    isSpeaking() {
        return this.speaking;
    }
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
        if (!this.recognition) {
            if (!this.init()) {
                alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
                return;
            }
        }
        
        this.recognition.lang = lang;
        
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            onResult(transcript, event.results[0].isFinal);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (onEnd) onEnd();
        };
        
        this.recognition.onerror = (event) => {
            console.error('STT Error:', event.error);
            this.isListening = false;
        };
        
        this.recognition.start();
        this.isListening = true;
    },
    
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }
};

// ===== BGM 플레이어 =====
const BGM = {
    audio: null,
    currentTrack: null,
    
    // 무료 BGM URL들 (실제 서비스에서는 자체 호스팅 권장)
    tracks: {
        lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        jazz: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c5.mp3',
        nature: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
        rain: 'https://cdn.pixabay.com/download/audio/2022/02/23/audio_ea70ad08cb.mp3',
        piano: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3'
    },
    
    play(trackName) {
        if (this.audio) {
            this.audio.pause();
        }
        
        const url = this.tracks[trackName];
        if (!url) return;
        
        this.audio = new Audio(url);
        this.audio.loop = true;
        this.audio.volume = 0.3;
        this.currentTrack = trackName;
        this.audio.play().catch(e => console.log('BGM 자동재생 차단됨'));
    },
    
    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
            this.currentTrack = null;
        }
    },
    
    setVolume(volume) {
        if (this.audio) {
            this.audio.volume = volume / 100;
        }
    },
    
    isPlaying() {
        return this.audio && !this.audio.paused;
    }
};
