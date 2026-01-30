/**
 * DAYOUNG's 통번역 스튜디오 - 기사 자동 생성 스크립트
 * 
 * RSS 피드에서 통번역사에게 필수적인 영역의 기사를 수집하고
 * Claude API를 사용하여 300단어 이상의 학습용 기사로 확장합니다.
 */

const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

// RSS 피드 소스 (통번역사 필수 영역)
const RSS_FEEDS = {
    economy: [
        { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
        { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC' }
    ],
    politics: [
        { url: 'https://feeds.reuters.com/Reuters/worldNews', source: 'Reuters' },
        { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
        { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' }
    ],
    law: [
        { url: 'https://feeds.reuters.com/reuters/politicsNews', source: 'Reuters' }
    ],
    health: [
        { url: 'https://feeds.reuters.com/reuters/healthNews', source: 'Reuters' },
        { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', source: 'BBC' }
    ],
    tech: [
        { url: 'https://feeds.reuters.com/reuters/technologyNews', source: 'Reuters' },
        { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC' }
    ]
};

const CATEGORIES = [
    { id: 'economy', name: '경제/금융', icon: '💹', description: '거시경제, 통화정책, 금융시장' },
    { id: 'politics', name: '국제정치/외교', icon: '🌍', description: '외교, 안보, 국제관계' },
    { id: 'law', name: '법률/규제', icon: '⚖️', description: '국제법, 통상법, 규제' },
    { id: 'health', name: '의료/보건', icon: '🏥', description: '공중보건, 의료정책, 제약' },
    { id: 'tech', name: '기술/IT', icon: '💻', description: 'AI, 반도체, 디지털 전환' }
];

const LEVELS = [
    { id: 'beginner', name: '초급', icon: '🌱', description: '기초 어휘와 단순한 문장 구조' },
    { id: 'intermediate', name: '중급', icon: '📚', description: '전문 용어와 복합 문장' },
    { id: 'advanced', name: '고급', icon: '🎓', description: '고급 표현과 뉘앙스' },
    { id: 'expert', name: '심화', icon: '👑', description: '실전 통역 수준의 고난도 텍스트' }
];

// RSS 파싱
async function parseRSS(url) {
    try {
        const response = await axios.get(url, { 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DayoungStudio/1.0)' }
        });
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        if (result.rss && result.rss.channel) {
            return result.rss.channel[0].item || [];
        } else if (result.feed && result.feed.entry) {
            return result.feed.entry.map(entry => ({
                title: entry.title,
                description: entry.summary || entry.content,
                link: entry.link?.[0]?.$.href || entry.link
            }));
        }
        return [];
    } catch (error) {
        console.error(`RSS 파싱 실패 (${url}):`, error.message);
        return [];
    }
}

// Claude API로 기사 확장 (핵심!)
async function expandArticleWithClaude(title, summary, category, source) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        console.log('  ⚠️ API 키 없음 - 기사 확장 불가');
        return null;
    }
    
    const categoryInfo = {
        economy: '경제/금융 (거시경제, 통화정책, 금융시장, 무역)',
        politics: '국제정치/외교 (외교, 안보, 국제관계, 정상회담)',
        law: '법률/규제 (국제법, 통상법, 규제, 판결)',
        health: '의료/보건 (공중보건, 의료정책, 제약, 임상시험)',
        tech: '기술/IT (AI, 반도체, 디지털 전환, 사이버보안)'
    };

    const prompt = `You are a professional news writer creating educational content for Korean-English translation/interpretation students.

Based on this news headline and summary, write a COMPLETE NEWS ARTICLE of 350-450 words.

**Headline:** ${title}
**Summary:** ${summary}
**Category:** ${categoryInfo[category]}
**Source Style:** ${source}

REQUIREMENTS:
1. Write exactly 350-450 words (this is critical!)
2. Write in clear, professional journalistic English
3. Include:
   - Opening paragraph with key facts (who, what, when, where, why)
   - 2-3 body paragraphs with details, context, and quotes
   - Background/context paragraph
   - Closing paragraph with implications or future outlook
4. Use vocabulary appropriate for the ${category} domain
5. Include realistic (but clearly fabricated) quotes from officials/experts
6. Make it suitable for translation practice

Respond with ONLY this JSON format (no markdown):
{
  "content": "The full 350-450 word article text here. Write multiple paragraphs separated by double newlines.",
  "level": "beginner|intermediate|advanced|expert",
  "keyTerms": [
    {"en": "English term 1", "ko": "한국어 번역 1"},
    {"en": "English term 2", "ko": "한국어 번역 2"},
    {"en": "English term 3", "ko": "한국어 번역 3"},
    {"en": "English term 4", "ko": "한국어 번역 4"},
    {"en": "English term 5", "ko": "한국어 번역 5"},
    {"en": "English term 6", "ko": "한국어 번역 6"}
  ]
}

Level guidelines:
- beginner: Simple vocabulary, short sentences (for general news)
- intermediate: Technical terms, compound sentences (standard news)
- advanced: Complex structures, nuanced expressions (in-depth analysis)
- expert: Highly specialized, diplomatic/legal language (expert commentary)

IMPORTANT: The article MUST be 350-450 words. Count carefully!`;

    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 2500,
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            timeout: 60000
        });
        
        const text = response.data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const wordCount = parsed.content.split(/\s+/).filter(w => w.length > 0).length;
            
            console.log(`  ✓ 확장 완료: ${wordCount}단어`);
            
            // 300단어 미만이면 스킵
            if (wordCount < 300) {
                console.log(`  ⚠️ 단어 수 부족 (${wordCount}), 스킵`);
                return null;
            }
            
            return parsed;
        }
    } catch (error) {
        console.error('  ✗ Claude API 오류:', error.message);
    }
    
    return null;
}

// 단어 수 계산
function countWords(text) {
    return text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
}

// 메인 실행
async function main() {
    console.log('🦜 DAYOUNG\'s 통번역 스튜디오 - 기사 업데이트\n');
    console.log('=' .repeat(50));
    
    const newArticles = [];
    let articleId = 101;
    
    for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
        console.log(`\n📰 [${category.toUpperCase()}] 카테고리`);
        
        for (const feed of feeds) {
            console.log(`\n  📡 ${feed.source} 피드...`);
            const items = await parseRSS(feed.url);
            
            if (items.length === 0) {
                console.log('    (기사 없음)');
                continue;
            }
            
            // 소스별 1개씩만
            const item = items[0];
            
            const title = (Array.isArray(item.title) ? item.title[0] : item.title)?.replace(/<[^>]+>/g, '').trim();
            const description = (Array.isArray(item.description) ? item.description[0] : item.description || '')?.replace(/<[^>]+>/g, '').trim();
            const link = Array.isArray(item.link) ? item.link[0] : item.link;
            
            if (!title || title.length < 20) continue;
            
            console.log(`    "${title.substring(0, 50)}..."`);
            
            // Claude로 기사 확장 (350-450단어)
            const expanded = await expandArticleWithClaude(title, description, category, feed.source);
            
            if (expanded && expanded.content) {
                newArticles.push({
                    id: articleId++,
                    title: title,
                    summary: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                    content: expanded.content,
                    category: category,
                    level: expanded.level || 'intermediate',
                    source: feed.source,
                    link: link,
                    wordCount: countWords(expanded.content),
                    keyTerms: expanded.keyTerms || [],
                    generatedAt: new Date().toISOString()
                });
            }
            
            // API 레이트 리밋 방지 (3초 대기)
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ 새로 생성된 기사: ${newArticles.length}개`);
    
    // 기존 데이터 로드
    const dataPath = path.join(__dirname, '..', 'data', 'articles.json');
    let existingData;
    
    try {
        existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.log('기존 파일 없음, 새로 생성');
        existingData = { articles: [] };
    }
    
    // 기본 기사 (ID 1-16) 유지
    const coreArticles = existingData.articles.filter(a => a.id <= 16);
    
    // 이전 자동생성 기사 중 최근 30개만 유지
    const oldGenerated = existingData.articles
        .filter(a => a.id > 100)
        .sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0))
        .slice(0, 30);
    
    // 새 기사 ID 재할당
    const maxOldId = oldGenerated.length > 0 ? Math.max(...oldGenerated.map(a => a.id)) : 100;
    newArticles.forEach((a, i) => {
        a.id = maxOldId + i + 1;
    });
    
    // 최종 데이터
    const finalArticles = [...coreArticles, ...newArticles, ...oldGenerated]
        .sort((a, b) => {
            if (a.id <= 16 && b.id > 16) return -1;
            if (a.id > 16 && b.id <= 16) return 1;
            return (b.id || 0) - (a.id || 0);
        })
        .slice(0, 50);
    
    const finalData = {
        date: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        categories: CATEGORIES,
        levels: LEVELS,
        articles: finalArticles
    };
    
    // 저장
    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2), 'utf8');
    
    console.log(`\n📊 최종 결과:`);
    console.log(`   - 기본 기사: ${coreArticles.length}개`);
    console.log(`   - 새 기사: ${newArticles.length}개`);
    console.log(`   - 이전 기사: ${oldGenerated.length}개`);
    console.log(`   - 총 기사: ${finalArticles.length}개`);
    
    // 단어 수 통계
    const wordCounts = finalArticles.map(a => countWords(a.content));
    console.log(`\n📏 단어 수 통계:`);
    console.log(`   - 최소: ${Math.min(...wordCounts)}단어`);
    console.log(`   - 최대: ${Math.max(...wordCounts)}단어`);
    console.log(`   - 평균: ${Math.round(wordCounts.reduce((a,b)=>a+b,0)/wordCounts.length)}단어`);
    
    const under300 = wordCounts.filter(w => w < 300).length;
    if (under300 > 0) {
        console.log(`   ⚠️ 300단어 미만: ${under300}개`);
    } else {
        console.log(`   ✓ 모든 기사 300단어 이상!`);
    }
}

main().catch(console.error);
