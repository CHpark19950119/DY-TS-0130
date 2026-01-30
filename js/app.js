// ===== DAYOUNG's 통번역 스튜디오 v3 - Main App =====

const App = {
    articles: [], categories: [], levels: [],
    currentArticle: null, phrases: [], phraseIndex: 0,
    phraseFeedbacks: [], translateDirection: 'en-ko',
    currentArchiveId: null, recommendedArticle: null,
    githubToken: null, githubOwner: 'CHpark19950119', githubRepo: '-NEWLASTTS'
};

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTheme(); initProfile();
    await loadArticles();
    loadUserData(); setupEvents();
    updateDashboard(); renderGrass();
    checkDailyFortune(); createParticles();
    Achievements.checkTimeAchievements();
    
    // GitHub 토큰 로드
    App.githubToken = Storage.get('githubToken', null);
});

function initTheme() {
    const profile = Storage.getProfile();
    document.documentElement.setAttribute('data-theme', profile.theme || 'light');
    const effects = profile.effects || { particles: false, gradient: true, pattern: false };
    document.querySelector('.bg-particles')?.classList.toggle('hidden', !effects.particles);
    document.querySelector('.bg-gradient')?.classList.toggle('hidden', !effects.gradient);
    document.querySelector('.bg-pattern')?.classList.toggle('hidden', !effects.pattern);
}

function initProfile() {
    const profile = Storage.getProfile();
    const level = Storage.getLevel();
    const title = Storage.getTitleForLevel(level.level);
    document.getElementById('sidebar-mascot').textContent = profile.mascot;
    document.getElementById('mascot-level').textContent = 'Lv.' + level.level;
    document.getElementById('studio-name').textContent = profile.nickname + profile.studioName;
    document.getElementById('studio-title').textContent = title;
    document.getElementById('header-name').textContent = profile.nickname;
    updateExpBar();
}

function updateExpBar() {
    const level = Storage.getLevel();
    const required = Storage.getExpForNextLevel();
    const pct = Math.min((level.exp / required) * 100, 100);
    document.getElementById('exp-bar-fill').style.width = pct + '%';
    document.getElementById('exp-text').textContent = level.exp + ' / ' + required + ' EXP';
    document.getElementById('exp-fill').style.width = pct + '%';
    document.getElementById('exp-display').textContent = level.exp + ' / ' + required + ' EXP';
    document.getElementById('user-level').textContent = level.level;
    document.getElementById('user-title').textContent = Storage.getTitleForLevel(level.level);
}

async function loadArticles() {
    try {
        const res = await fetch('./data/articles.json');
        const data = await res.json();
        App.articles = data.articles || [];
        App.categories = data.categories || [];
        App.levels = data.levels || [];
        document.getElementById('article-count').textContent = App.articles.length;
        updateRecommended(); updateNewArticles();
    } catch (e) { console.error(e); showToast('기사 로딩 실패', 'error'); }
}

function loadUserData() {
    const streak = Storage.getStreak();
    document.getElementById('streak-count').textContent = streak.count;
    document.getElementById('streak-best').textContent = '최고: ' + streak.best + '일';
    const settings = Storage.getSettings();
    document.getElementById('time-goal').textContent = settings.dailyGoal;
    document.getElementById('quiz-best').textContent = Storage.getGameBest('quiz');
    document.getElementById('typing-best').textContent = Storage.getGameBest('typing');
    document.getElementById('matching-best').textContent = Storage.getGameBest('matching') || '-';
    document.getElementById('speed-best').textContent = Storage.getGameBest('speed');
    updateGachaTickets();
    document.getElementById('diary-text').value = Storage.getDiary();
    updateDdayDisplay();
}

function setupEvents() {
    document.querySelectorAll('.nav-item, .mnav').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.view)));
    ['filter-cat', 'filter-level', 'filter-direction', 'filter-sort'].forEach(id => document.getElementById(id)?.addEventListener('change', renderArticles));
    document.getElementById('archive-filter')?.addEventListener('change', renderArchive);
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); renderVocab(btn.dataset.tab);
    }));
    document.querySelectorAll('.ach-tab').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.ach-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); renderAchievements(btn.dataset.tab);
    }));
    document.getElementById('set-tts-speed')?.addEventListener('input', (e) => {
        document.getElementById('tts-speed-val').textContent = e.target.value + 'x';
    });
}

function navigateTo(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view)?.classList.add('active');
    document.querySelectorAll('.nav-item, .mnav').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'dashboard') updateDashboard();
    else if (view === 'articles') renderArticles();
    else if (view === 'vocabulary') renderVocab('today');
    else if (view === 'archive') renderArchive();
    else if (view === 'achievements') renderAchievements('all');
    else if (view === 'customize') loadCustomizeSettings();
    else if (view === 'settings') loadSettings();
}

// ========== TTS (토글 기능) ==========
function speakText(text, rate) { 
    TTS.speak(text, 'en-US', rate || Storage.getSettings().ttsSpeed || 0.9); 
}

function speakPhrase() { 
    if (App.phrases[App.phraseIndex]) {
        const text = App.translateDirection === 'en-ko' 
            ? App.phrases[App.phraseIndex].en 
            : (App.phrases[App.phraseIndex].ko || App.phrases[App.phraseIndex].en);
        const lang = App.translateDirection === 'en-ko' ? 'en-US' : 'ko-KR';
        TTS.speak(text, lang, Storage.getSettings().ttsSpeed || 0.9);
    }
}

// ========== 대시보드 ==========
function updateDashboard() {
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const daily = Storage.getDailyProgress();
    const tasks = [daily.article, daily.translate, daily.vocab, daily.quiz];
    const pct = Math.round((tasks.filter(Boolean).length / 4) * 100);
    document.getElementById('hero-pct').textContent = pct + '%';
    const ring = document.getElementById('hero-ring');
    if (ring) { const c = 2 * Math.PI * 52; ring.style.strokeDasharray = c; ring.style.strokeDashoffset = c - (pct / 100) * c; }
    ['article', 'translate', 'vocab', 'quiz'].forEach((t, i) => {
        const el = document.getElementById('hc-' + t);
        if (el) el.querySelector('i').textContent = tasks[i] ? '●' : '○';
    });
    document.getElementById('dash-time').textContent = daily.time || 0;
    const vocab = Storage.getVocabulary();
    document.getElementById('dv-total').textContent = vocab.length;
    document.getElementById('dv-mastered').textContent = vocab.filter(w => w.mastered).length;
    document.getElementById('dv-review').textContent = Storage.getReviewWords().length;
    const profile = Storage.getProfile();
    document.getElementById('mascot-big').textContent = profile.mascot;
    document.getElementById('mascot-name-display').textContent = profile.mascotName;
    const moods = ['기분 좋음 😊', '의욕 충만 🔥', '졸린 중 😴'];
    document.getElementById('mascot-mood').textContent = moods[Math.floor(Math.random() * moods.length)];
    const msgs = ['오늘도 화이팅! 💪', '꾸준함이 실력!', '잘하고 있어요! 🌟', pct + '% 달성! ' + (pct < 100 ? '조금만 더!' : '완벽!')];
    document.getElementById('mascot-msg').textContent = msgs[Math.floor(Math.random() * msgs.length)];
    updateRecentBadges(); updateExpBar();
}

function updateRecommended() {
    if (!App.articles.length) return;
    const history = Storage.getHistory().filter(h => h.type === 'article').map(h => h.articleId);
    const a = App.articles.find(x => !history.includes(x.id)) || App.articles[0];
    const cat = App.categories.find(c => c.id === a.category) || { icon: '📰', name: a.category };
    const lv = App.levels.find(l => l.id === a.level) || { icon: '📚', name: a.level };
    document.getElementById('rec-cat').textContent = cat.icon + ' ' + cat.name;
    document.getElementById('rec-level').textContent = lv.icon + ' ' + lv.name;
    document.getElementById('rec-title').textContent = a.title;
    document.getElementById('rec-source').textContent = a.source || '';
    document.getElementById('rec-date').textContent = formatDate(a.generatedAt);
    document.getElementById('rec-new').textContent = a.id > 100 ? '🤖' : '';
    App.recommendedArticle = a;
}

function updateNewArticles() {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const newArts = App.articles.filter(a => a.generatedAt && new Date(a.generatedAt) > weekAgo).sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)).slice(0, 5);
    const el = document.getElementById('new-articles-list');
    el.innerHTML = !newArts.length ? '<p class="empty-small">최근 기사 없음</p>' : newArts.map(a => '<div class="new-article-item" onclick="selectArticle(' + a.id + ')"><span class="badge-new">🆕</span><span class="na-title">' + a.title.substring(0, 35) + '...</span><span class="na-date">' + formatDate(a.generatedAt) + '</span></div>').join('');
}

function updateRecentBadges() {
    const unlocked = Achievements.getUnlocked().slice(0, 4);
    const el = document.getElementById('recent-badges');
    el.innerHTML = !unlocked.length ? '<p class="empty-small">뱃지 없음</p>' : unlocked.map(a => '<div class="badge-mini" title="' + a.name + '">' + a.icon + '</div>').join('');
}

function updateDdayDisplay() {
    const dday = Storage.getDday();
    const el = document.getElementById('dday-display');
    if (!dday) { el.innerHTML = '<p class="empty-small">목표를 설정하세요</p>'; return; }
    const target = new Date(dday.date); const today = new Date();
    today.setHours(0,0,0,0); target.setHours(0,0,0,0);
    const diff = Math.ceil((target - today) / 86400000);
    el.innerHTML = '<div class="dday-num">' + (diff > 0 ? 'D-' : diff < 0 ? 'D+' : 'D-') + Math.abs(diff) + '</div><div class="dday-name">' + dday.name + '</div>';
}

function formatDate(d) { if (!d) return ''; const x = new Date(d); return (x.getMonth()+1) + '/' + x.getDate(); }
function startRecommended() { if (App.recommendedArticle) selectArticle(App.recommendedArticle.id); }

// ========== 잔디 ==========
function renderGrass() {
    const container = document.getElementById('grass-container');
    const grassData = Storage.getGrassData();
    const year = new Date().getFullYear();
    document.getElementById('grass-year').textContent = year;
    let html = '';
    const start = new Date(year, 0, 1); const today = new Date();
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().split('T')[0];
        const dd = grassData[ds];
        const lv = Storage.getGrassLevel(dd);
        html += '<div class="grass-day" data-level="' + lv + '" data-date="' + ds + '" title="' + ds + '"></div>';
    }
    container.innerHTML = html;
}

// ========== 기사 목록 ==========
function renderArticles() {
    const cat = document.getElementById('filter-cat')?.value || 'all';
    const lv = document.getElementById('filter-level')?.value || 'all';
    const sort = document.getElementById('filter-sort')?.value || 'newest';
    let list = [...App.articles];
    if (cat !== 'all') list = list.filter(a => a.category === cat);
    if (lv !== 'all') list = list.filter(a => a.level === lv);
    if (sort === 'newest') list.sort((a, b) => (b.id || 0) - (a.id || 0));
    else if (sort === 'oldest') list.sort((a, b) => (a.id || 0) - (b.id || 0));
    const grid = document.getElementById('articles-grid');
    if (!list.length) { grid.innerHTML = '<div class="empty-state"><p>기사 없음</p></div>'; return; }
    grid.innerHTML = list.map(a => {
        const ci = App.categories.find(c => c.id === a.category) || { icon: '📰', name: a.category };
        const li = App.levels.find(l => l.id === a.level) || { icon: '📚', name: a.level };
        return '<div class="article-card" onclick="selectArticle(' + a.id + ')"><div class="article-meta"><span>' + ci.icon + ' ' + ci.name + '</span><span>' + li.icon + ' ' + li.name + '</span>' + (a.id > 100 ? '<span class="badge-new">🤖</span>' : '') + '</div><h4>' + a.title + '</h4><p>' + (a.summary || a.content?.substring(0, 100) + '...') + '</p><div class="article-footer"><span>' + a.source + '</span><span>' + (a.wordCount || '-') + '단어</span></div></div>';
    }).join('');
}

function selectArticle(id) {
    const a = App.articles.find(x => x.id === id);
    if (!a) return;
    App.currentArticle = a;
    Storage.addHistory({ type: 'article', articleId: id });
    Storage.updateDailyProgress({ article: true });
    Achievements.check('special', { achievementId: 'first_article' });
    Storage.updateStreak();
    setupTranslation(a);
    navigateTo('translate');
}

// ========== 번역 연습 ==========
function setupTranslation(a) {
    document.getElementById('trans-empty').style.display = 'none';
    document.getElementById('trans-content').style.display = 'block';
    const ci = App.categories.find(c => c.id === a.category) || { icon: '📰', name: a.category };
    const li = App.levels.find(l => l.id === a.level) || { icon: '📚', name: a.level };
    document.getElementById('trans-cat').textContent = ci.icon + ' ' + ci.name;
    document.getElementById('trans-level').textContent = li.icon + ' ' + li.name;
    document.getElementById('trans-title').textContent = a.title;
    const content = a.content || '';
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    // 한국어 번역이 있으면 함께 저장
    const koContent = a.koreanContent || '';
    const koSentences = koContent ? (koContent.match(/[^.!?。]+[.!?。]+/g) || [koContent]) : [];
    
    App.phrases = sentences.map((s, i) => ({ 
        en: s.trim(), 
        ko: koSentences[i]?.trim() || '' 
    }));
    App.phraseIndex = 0; 
    App.phraseFeedbacks = [];
    
    if (a.keyTerms?.length) {
        document.getElementById('key-terms-list').innerHTML = a.keyTerms.map(t => '<span class="key-term" onclick="addTermToVocab(\'' + t.en.replace(/'/g, "\\'") + '\', \'' + t.ko.replace(/'/g, "\\'") + '\')">' + t.en + ' <span class="ko">' + t.ko + '</span></span>').join('');
    }
    updatePhraseDisplay();
}

// ========== 한영/영한 전환 ==========
function setTranslateDirection(dir) {
    App.translateDirection = dir;
    document.querySelectorAll('.dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === dir));
    
    // 플레이스홀더 업데이트
    const input = document.getElementById('trans-input');
    if (dir === 'en-ko') {
        input.placeholder = '한국어로 번역하세요...';
    } else {
        input.placeholder = 'Translate to English...';
    }
    
    updatePhraseDisplay();
}

function updatePhraseDisplay() {
    const p = App.phrases[App.phraseIndex]; if (!p) return;
    const total = App.phrases.length; const cur = App.phraseIndex + 1;
    document.getElementById('trans-progress-fill').style.width = (cur / total * 100) + '%';
    document.getElementById('trans-progress-text').textContent = cur + ' / ' + total;
    document.getElementById('phrase-num').textContent = cur;
    
    // 방향에 따라 원문 표시
    if (App.translateDirection === 'en-ko') {
        document.getElementById('phrase-text').textContent = p.en;
    } else {
        // 한영 번역: 한국어 원문 표시 (없으면 영어로 대체)
        document.getElementById('phrase-text').textContent = p.ko || p.en;
    }
    
    document.getElementById('trans-input').value = '';
    document.getElementById('feedback-area').style.display = 'none';
}

// ========== 첨삭 (모델 선택) ==========
async function submitTranslation(usePremium = false) {
    const input = document.getElementById('trans-input').value.trim();
    if (!input) { showToast('번역을 입력해주세요', 'warning'); return; }
    
    const modelName = usePremium ? 'Claude Sonnet' : 'GPT-5 mini';
    showLoading(true, modelName + ' 첨삭 중...');
    
    const p = App.phrases[App.phraseIndex];
    const orig = App.translateDirection === 'en-ko' ? p.en : (p.ko || p.en);
    
    try {
        const fb = await API.getTranslationFeedback(orig, input, App.translateDirection, usePremium);
        App.phraseFeedbacks.push({ original: orig, userTranslation: input, feedback: fb, score: fb.score, model: modelName });
        
        // 모델 표시 추가
        const modelBadge = usePremium 
            ? '<span class="model-badge premium">✨ Claude Sonnet</span>' 
            : '<span class="model-badge">🚀 GPT-5 mini</span>';
        
        document.getElementById('feedback-score').textContent = fb.score;
        document.getElementById('feedback-content').innerHTML = modelBadge + '<p>' + fb.feedback + '</p>' + 
            (fb.goodPoints?.length ? '<h4>✅ 잘한 점</h4><ul>' + fb.goodPoints.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + 
            (fb.improvements?.length ? '<h4>💡 개선점</h4><ul>' + fb.improvements.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') + 
            (fb.modelAnswer ? '<h4>📝 모범 번역</h4><div class="model-answer">' + fb.modelAnswer + '</div>' : '');
        document.getElementById('feedback-area').style.display = 'block';
        
        const exp = Math.floor(fb.score / 10);
        const result = Storage.addExp(exp);
        Storage.updateGrass(1, 1);
        Storage.updateDailyProgress({ translate: true });
        if (result.leveledUp) showLevelUp(result.newLevel);
        Achievements.check('translations').forEach(a => showBadgeUnlock(a));
    } catch (e) { 
        showToast('첨삭 실패: ' + e.message, 'error'); 
        console.error(e); 
    }
    showLoading(false);
}

// GPT 첨삭 (기본)
function submitWithGPT() {
    submitTranslation(false);
}

// Claude 프리미엄 첨삭
function submitWithClaude() {
    submitTranslation(true);
}

function skipPhrase() { App.phraseFeedbacks.push({ original: App.phrases[App.phraseIndex].en, userTranslation: '', score: 0, skipped: true }); nextPhrase(); }

function nextPhrase() {
    App.phraseIndex++;
    if (App.phraseIndex < App.phrases.length) updatePhraseDisplay();
    else finishTranslation();
}

function finishTranslation() {
    const completed = App.phraseFeedbacks.filter(f => !f.skipped).length;
    const avg = completed > 0 ? Math.round(App.phraseFeedbacks.filter(f => !f.skipped).reduce((s, f) => s + f.score, 0) / completed) : 0;
    Storage.addArchive({ type: 'translation', articleId: App.currentArticle.id, articleTitle: App.currentArticle.title, totalPhrases: App.phrases.length, completedPhrases: completed, averageScore: avg, phraseFeedbacks: App.phraseFeedbacks, direction: App.translateDirection });
    Storage.addGachaTicket(1);
    showToast('완료! 평균 ' + avg + '점, +1 티켓');
    navigateTo('dashboard'); updateDashboard();
}

function addTermToVocab(en, ko) { Storage.addWord({ english: en, korean: ko }); showToast('"' + en + '" 추가됨'); }

// ========== 기사 업데이트 (GitHub Actions 트리거) ==========
async function triggerArticleUpdate() {
    if (!App.githubToken) {
        const token = prompt('GitHub Personal Access Token을 입력하세요:\n(처음 한 번만 입력하면 저장됩니다)');
        if (!token) return;
        App.githubToken = token;
        Storage.set('githubToken', token);
    }
    
    showLoading(true, '기사 업데이트 요청 중...');
    
    const success = await API.triggerArticleUpdate(App.githubToken, App.githubOwner, App.githubRepo);
    
    showLoading(false);
    
    if (success) {
        showToast('기사 업데이트가 시작되었습니다! 3-5분 후 새로고침하세요.', 'success');
    } else {
        showToast('업데이트 요청 실패. 토큰을 확인해주세요.', 'error');
        App.githubToken = null;
        Storage.remove('githubToken');
    }
}

function openArticleUpdateModal() {
    document.getElementById('article-update-modal').classList.add('active');
}

function closeArticleUpdateModal() {
    document.getElementById('article-update-modal').classList.remove('active');
}

// ========== 단어장 ==========
function renderVocab(tab) {
    let words = [];
    if (tab === 'today') words = Storage.getTodayWords();
    else if (tab === 'all') words = Storage.getVocabulary();
    else if (tab === 'starred') words = Storage.getVocabulary().filter(w => w.starred);
    else if (tab === 'review') words = Storage.getReviewWords();
    const el = document.getElementById('vocab-list');
    if (!words.length) { el.innerHTML = '<div class="empty-state"><p>단어 없음</p></div>'; return; }
    el.innerHTML = words.map(w => '<div class="vocab-item"><span class="vocab-en">' + w.english + '</span><span class="vocab-ko">' + w.korean + '</span>' + (w.partOfSpeech ? '<span class="vocab-pos">' + w.partOfSpeech + '</span>' : '') + '<div class="vocab-actions"><button onclick="toggleStar(' + w.id + ')" class="' + (w.starred ? 'starred' : '') + '">' + (w.starred ? '⭐' : '☆') + '</button><button onclick="speakText(\'' + w.english.replace(/'/g, "\\'") + '\')">🔊</button><button onclick="deleteWord(' + w.id + ')">🗑️</button></div></div>').join('');
}

function openWordModal() { document.getElementById('word-modal').classList.add('active'); }
function closeWordModal() { document.getElementById('word-modal').classList.remove('active'); }

function addWord() {
    const en = document.getElementById('nw-en').value.trim();
    const ko = document.getElementById('nw-kr').value.trim();
    if (!en || !ko) { showToast('영어와 한국어 입력', 'warning'); return; }
    Storage.addWord({ english: en, korean: ko, partOfSpeech: document.getElementById('nw-pos').value, example: document.getElementById('nw-ex').value });
    closeWordModal();
    ['nw-en', 'nw-kr', 'nw-pos', 'nw-ex'].forEach(id => document.getElementById(id).value = '');
    renderVocab('today');
    Storage.updateDailyProgress({ vocab: true });
    Achievements.check('vocabulary').forEach(a => showBadgeUnlock(a));
    showToast('단어 추가됨');
}

function toggleStar(id) { const w = Storage.getVocabulary().find(x => x.id === id); if (w) { Storage.updateWord(id, { starred: !w.starred }); renderVocab(document.querySelector('.tab-btn.active')?.dataset.tab || 'today'); } }
function deleteWord(id) { if (confirm('삭제?')) { Storage.deleteWord(id); renderVocab(document.querySelector('.tab-btn.active')?.dataset.tab || 'today'); showToast('삭제됨'); } }

// ========== 게임 ==========
function startGame(type) {
    document.querySelector('.games-grid').style.display = 'none';
    document.getElementById('game-play-area').style.display = 'block';
    let ok = false;
    if (type === 'quiz') ok = Games.quiz.start(10, 'mixed', 'all');
    else if (type === 'typing') ok = Games.typing.start();
    else if (type === 'matching') ok = Games.matching.start(8);
    else if (type === 'speed') ok = Games.speed.start();
    if (ok) { Games.current = type; renderGameUI(type); } else closeGame();
}

function updateGachaTickets() {
    const t = Storage.getGachaTickets();
    document.getElementById('gacha-tickets').textContent = t;
    const m = document.getElementById('gacha-tickets-modal'); if (m) m.textContent = t;
}

function openGacha() { document.getElementById('gacha-modal').classList.add('active'); document.getElementById('gacha-tickets-modal').textContent = Storage.getGachaTickets(); document.getElementById('gacha-result').style.display = 'none'; document.getElementById('gacha-ball').textContent = '?'; }
function closeGacha() { document.getElementById('gacha-modal').classList.remove('active'); }

function pullGacha() {
    if (Storage.getGachaTickets() <= 0) { showToast('티켓 부족', 'error'); return; }
    const m = document.getElementById('gacha-machine'); m.classList.add('spinning');
    setTimeout(() => {
        m.classList.remove('spinning');
        const r = Gacha.pull();
        if (r) {
            document.getElementById('gacha-ball').textContent = r.item || '🎁';
            document.getElementById('gacha-result').style.display = 'block';
            document.getElementById('gacha-reward').textContent = r.item || '🎁';
            document.getElementById('gacha-reward').style.color = Gacha.getRarityColor(r.rarity);
            document.getElementById('gacha-reward-name').textContent = Gacha.getRarityName(r.rarity) + ' - ' + r.name;
        }
        updateGachaTickets();
    }, 500);
}

// ========== 아카이브 ==========
function renderArchive() {
    const filter = document.getElementById('archive-filter')?.value || 'all';
    let list = Storage.getArchive();
    if (filter !== 'all') list = list.filter(a => a.type === filter);
    const el = document.getElementById('archive-list');
    if (!list.length) { el.innerHTML = '<div class="empty-state"><p>아카이브 없음</p></div>'; return; }
    el.innerHTML = list.map(a => '<div class="archive-card" onclick="openArchive(' + a.id + ')"><div class="article-meta"><span>' + (a.type === 'translation' ? '✍️ 번역' : '🎙️ 통역') + '</span><span>' + new Date(a.date).toLocaleDateString('ko-KR') + '</span>' + (a.averageScore ? '<span>' + a.averageScore + '점</span>' : '') + '</div><h4>' + (a.articleTitle || '제목 없음') + '</h4><p>' + (a.completedPhrases || 0) + '/' + (a.totalPhrases || 0) + ' 문장</p></div>').join('');
}

function openArchive(id) {
    const a = Storage.getArchive().find(x => x.id === id); if (!a) return;
    App.currentArchiveId = id;
    document.getElementById('am-title').textContent = (a.type === 'translation' ? '✍️ 번역' : '🎙️ 통역') + ' - ' + a.articleTitle;
    let body = '<div style="margin-bottom:16px"><p>총 ' + (a.totalPhrases || 0) + '문장 중 ' + (a.completedPhrases || 0) + '문장 완료</p><p>평균 점수: <strong>' + (a.averageScore || 0) + '</strong>점</p></div>';
    if (a.phraseFeedbacks?.length) { body += '<h4>📝 문장별 첨삭</h4>'; body += a.phraseFeedbacks.map((f, i) => '<div style="padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:8px"><strong>' + (i + 1) + '.</strong> "' + f.original + '"<br><span style="color:var(--text-secondary)">내 번역: ' + (f.userTranslation || '(건너뜀)') + '</span><br><span style="color:var(--accent-primary)">점수: ' + (f.score || 0) + '점' + (f.model ? ' (' + f.model + ')' : '') + '</span></div>').join(''); }
    document.getElementById('am-body').innerHTML = body;
    document.getElementById('am-memo').value = a.memo || '';
    document.getElementById('archive-modal').classList.add('active');
}

function closeArchiveModal() { document.getElementById('archive-modal').classList.remove('active'); }
function saveArchiveMemo() { if (App.currentArchiveId) { Storage.updateArchiveItem(App.currentArchiveId, { memo: document.getElementById('am-memo').value }); showToast('메모 저장됨'); } }

// ========== 업적 ==========
function renderAchievements(cat) {
    const all = Achievements.getByCategory(cat);
    const unlocked = Storage.getAchievements();
    const total = Achievements.list.length; const count = unlocked.length;
    document.getElementById('ach-unlocked').textContent = count;
    document.getElementById('ach-total').textContent = total;
    document.getElementById('ach-percent').textContent = Math.round(count / total * 100) + '%';
    document.getElementById('achievements-grid').innerHTML = all.map(a => '<div class="achievement-card ' + (unlocked.includes(a.id) ? 'unlocked' : 'locked') + '"><div class="achievement-icon">' + a.icon + '</div><h4>' + a.name + '</h4><p>' + a.desc + '</p></div>').join('');
}

// ========== 꾸미기 ==========
function loadCustomizeSettings() {
    const p = Storage.getProfile();
    document.getElementById('custom-nickname').value = p.nickname || 'DAYOUNG';
    document.getElementById('custom-studio').value = p.studioName || "'s Studio";
    document.getElementById('mascot-preview').textContent = p.mascot || '🦜';
    document.getElementById('mascot-name-input').value = p.mascotName || '파랑이';
    document.querySelectorAll('.mascot-opt').forEach(b => b.classList.toggle('active', b.dataset.mascot === p.mascot));
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === p.theme));
    const e = p.effects || {};
    document.getElementById('effect-particles').checked = e.particles || false;
    document.getElementById('effect-gradient').checked = e.gradient !== false;
    document.getElementById('effect-pattern').checked = e.pattern || false;
    renderStickerCollection();
}

function selectMascot(m) { document.getElementById('mascot-preview').textContent = m; document.querySelectorAll('.mascot-opt').forEach(b => b.classList.toggle('active', b.dataset.mascot === m)); }
function setTheme(t) { document.documentElement.setAttribute('data-theme', t); document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t)); Achievements.check('special', { achievementId: 'customizer' }); }
function toggleEffect(e) { const el = document.querySelector('.bg-' + (e === 'particles' ? 'particles' : e)); if (el) el.classList.toggle('hidden'); }

function renderStickerCollection() {
    const owned = Storage.getStickers();
    const all = ['⭐', '❤️', '🔥', '🌸', '🎈', '🍀', '🌙', '🦋', '🌈', '🎭', '🎪', '🐉', '🦄', '🔮', '👑', '💎'];
    document.getElementById('sticker-collection').innerHTML = all.map(s => '<div class="sticker-item ' + (owned.includes(s) ? '' : 'locked') + '">' + s + '</div>').join('');
}

function saveCustomization() {
    const p = { nickname: document.getElementById('custom-nickname').value || 'DAYOUNG', studioName: document.getElementById('custom-studio').value || "'s Studio", mascot: document.getElementById('mascot-preview').textContent || '🦜', mascotName: document.getElementById('mascot-name-input').value || '파랑이', theme: document.querySelector('.theme-opt.active')?.dataset.theme || 'light', effects: { particles: document.getElementById('effect-particles').checked, gradient: document.getElementById('effect-gradient').checked, pattern: document.getElementById('effect-pattern').checked } };
    Storage.saveProfile(p); initProfile(); initTheme(); showToast('저장됨');
}

// ========== 설정 ==========
function loadSettings() {
    const s = Storage.getSettings();
    document.getElementById('set-goal').value = s.dailyGoal || 60;
    document.getElementById('set-tts-speed').value = s.ttsSpeed || 0.9;
    document.getElementById('tts-speed-val').textContent = (s.ttsSpeed || 0.9) + 'x';
    
    // GitHub 토큰 표시
    if (App.githubToken) {
        document.getElementById('github-token-status').textContent = '✅ 등록됨';
    }
}

function saveSettings() {
    const settings = {
        dailyGoal: parseInt(document.getElementById('set-goal').value) || 60,
        ttsSpeed: parseFloat(document.getElementById('set-tts-speed').value) || 0.9
    };
    Storage.saveSettings(settings);
    showToast('설정 저장됨');
}

function resetGithubToken() {
    App.githubToken = null;
    Storage.remove('githubToken');
    document.getElementById('github-token-status').textContent = '❌ 미등록';
    showToast('GitHub 토큰 초기화됨');
}

function saveDday() { const n = document.getElementById('set-dday-name').value; const d = document.getElementById('set-dday-date').value; if (n && d) { Storage.saveDday(n, d); updateDdayDisplay(); showToast('D-Day 설정됨'); } }
function saveDiary() { Storage.saveDiary(document.getElementById('diary-text').value); showToast('일기 저장됨'); }
function exportData() { const d = Storage.exportData(); const b = new Blob([d], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'dayoung_backup.json'; a.click(); showToast('내보내기됨'); }
function importData() { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async (e) => { const f = e.target.files[0]; if (f) { const t = await f.text(); if (Storage.importData(t)) { showToast('가져오기됨'); location.reload(); } else showToast('실패', 'error'); } }; i.click(); }
function resetData() { if (confirm('모든 데이터 삭제?')) { Storage.resetAll(); location.reload(); } }

// ========== 운세 ==========
function checkDailyFortune() { const l = Storage.getLastFortune(); if (l.date !== new Date().toDateString()) setTimeout(() => showFortune(), 2000); }
function showFortune() { const f = Fortune.get(); document.getElementById('fortune-result').textContent = f.text; document.getElementById('fortune-word').textContent = f.word; document.getElementById('fortune-modal').classList.add('active'); }
function closeFortuneModal() { document.getElementById('fortune-modal').classList.remove('active'); const f = Fortune.get(); document.getElementById('fortune-text').textContent = f.text; document.getElementById('fortune-banner').style.display = 'flex'; }
function closeFortune() { document.getElementById('fortune-banner').style.display = 'none'; }

// ========== 모달 ==========
function showBadgeUnlock(a) { document.getElementById('badge-unlock-icon').textContent = a.icon; document.getElementById('badge-unlock-name').textContent = a.name; document.getElementById('badge-unlock-desc').textContent = a.desc; document.getElementById('badge-modal').classList.add('active'); }
function closeBadgeModal() { document.getElementById('badge-modal').classList.remove('active'); }
function showLevelUp(n) { document.getElementById('levelup-num').textContent = n; document.getElementById('levelup-title').textContent = Storage.getTitleForLevel(n); document.getElementById('levelup-modal').classList.add('active'); if (n >= 5) Achievements.check('special', { achievementId: 'level_5' }); if (n >= 10) Achievements.check('special', { achievementId: 'level_10' }); }
function closeLevelupModal() { document.getElementById('levelup-modal').classList.remove('active'); }

// ========== BGM ==========
function toggleBGM() { document.getElementById('bgm-controls').classList.toggle('active'); }
function changeBGM() { const t = document.getElementById('bgm-select').value; if (t) { BGM.play(t); document.getElementById('bgm-icon').textContent = '🔊'; } else { BGM.stop(); document.getElementById('bgm-icon').textContent = '🔇'; } }
function setBGMVolume() { BGM.setVolume(document.getElementById('bgm-volume').value); }

// ========== 파티클 ==========
function createParticles() { const c = document.getElementById('particles'); if (!c) return; for (let i = 0; i < 20; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.left = Math.random() * 100 + '%'; p.style.top = Math.random() * 100 + '%'; p.style.animationDelay = Math.random() * 15 + 's'; p.style.animationDuration = (10 + Math.random() * 10) + 's'; c.appendChild(p); } }

// ========== 유틸 ==========
function showLoading(s, msg) { 
    const el = document.getElementById('loading');
    el.style.display = s ? 'flex' : 'none'; 
    if (msg && s) {
        el.querySelector('.loading-text')?.remove();
        const txt = document.createElement('p');
        txt.className = 'loading-text';
        txt.textContent = msg;
        txt.style.color = 'white';
        txt.style.marginTop = '16px';
        el.appendChild(txt);
    }
}
function showToast(m, t) { const to = document.createElement('div'); to.className = 'toast ' + (t || 'success'); to.textContent = m; document.getElementById('toasts').appendChild(to); setTimeout(() => to.remove(), 3000); }
function refreshArticles() { showToast('새로고침...'); loadArticles(); }
