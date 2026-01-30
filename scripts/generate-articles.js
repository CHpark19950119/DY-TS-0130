// ===== 기사 자동 생성 스크립트 =====
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 다양한 RSS 소스
const RSS_SOURCES = [
  // 경제
  { url: 'https://feeds.reuters.com/reuters/businessNews', category: 'economy', source: 'Reuters' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'economy', source: 'Bloomberg' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'economy', source: 'NYT' },
  
  // 정치/외교
  { url: 'https://feeds.reuters.com/Reuters/worldNews', category: 'politics', source: 'Reuters' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'politics', source: 'BBC' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'politics', source: 'NYT' },
  
  // 기술
  { url: 'https://feeds.reuters.com/reuters/technologyNews', category: 'tech', source: 'Reuters' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'tech', source: 'NYT' },
  
  // 보건
  { url: 'https://feeds.reuters.com/reuters/healthNews', category: 'health', source: 'Reuters' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', category: 'health', source: 'NYT' },
];

// RSS 파싱 (간단한 정규식 방식)
async function fetchRSS(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await response.text();
    
    const items = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches.slice(0, 5)) {
      const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
      const description = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1] || '';
      
      if (title && title.length > 20) {
        items.push({
          title: title.replace(/<[^>]*>/g, '').trim(),
          summary: description.replace(/<[^>]*>/g, '').substring(0, 200).trim()
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error(`RSS fetch error (${url}):`, error.message);
    return [];
  }
}

// GPT로 기사 확장
async function expandArticle(title, summary, category, source) {
  const categoryInfo = {
    economy: '경제/금융 (거시경제, 통화정책, 금융시장, 기업 실적)',
    politics: '국제정치/외교 (외교, 안보, 국제관계, 정상회담)',
    law: '법률/규제 (국제법, 통상법, 규제 정책)',
    health: '의료/보건 (공중보건, 의료정책, 신약 개발)',
    tech: '기술/IT (AI, 반도체, 디지털 전환, 스타트업)'
  };

  const prompt = `You are a Reuters/Bloomberg-level professional news writer.

## Task
Write a professional English news article for translation practice.

Title: ${title}
Summary: ${summary}
Category: ${categoryInfo[category] || category}
Source style: ${source}

## Requirements
1. Write 350-450 words in formal journalistic English
2. Structure: Lead → Body → Expert quote → Outlook
3. Include specific numbers, dates, and names
4. Use advanced vocabulary suitable for translation exams
5. Maintain objective, neutral tone

Respond ONLY with this JSON format:
{
  "content": "Full article text (350-450 words)",
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Article expansion error:', error.message);
  }
  
  return null;
}

// 메인 실행
async function main() {
  console.log('📰 Starting article generation...');
  
  // 기존 기사 로드
  const articlesPath = path.join(__dirname, '..', 'data', 'articles.json');
  let existingData = { articles: [], categories: [], levels: [] };
  
  try {
    existingData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } catch (e) {
    console.log('Creating new articles.json');
  }
  
  // 카테고리/레벨 정의
  existingData.categories = [
    { id: 'economy', name: '경제', icon: '💰' },
    { id: 'politics', name: '정치/외교', icon: '🌍' },
    { id: 'tech', name: '기술', icon: '💻' },
    { id: 'health', name: '보건', icon: '🏥' },
    { id: 'law', name: '법률', icon: '⚖️' }
  ];
  
  existingData.levels = [
    { id: 'intermediate', name: '중급', icon: '📗' },
    { id: 'advanced', name: '고급', icon: '📘' },
    { id: 'expert', name: '전문가', icon: '📕' }
  ];
  
  const newArticles = [];
  let articleId = Math.max(0, ...existingData.articles.map(a => a.id || 0)) + 1;
  
  // 각 카테고리에서 1-2개씩 기사 생성
  for (const source of RSS_SOURCES) {
    console.log(`\n📡 Fetching from ${source.source} (${source.category})...`);
    
    const items = await fetchRSS(source.url);
    
    if (items.length === 0) {
      console.log('  No items found');
      continue;
    }
    
    // 첫 번째 아이템만 처리 (비용 절약)
    const item = items[0];
    console.log(`  Processing: ${item.title.substring(0, 50)}...`);
    
    const expanded = await expandArticle(item.title, item.summary, source.category, source.source);
    
    if (expanded && expanded.content) {
      newArticles.push({
        id: articleId++,
        title: item.title,
        summary: item.summary,
        content: expanded.content,
        category: source.category,
        level: expanded.level || 'advanced',
        source: source.source,
        keyTerms: expanded.keyTerms || [],
        wordCount: expanded.content.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      });
      console.log(`  ✅ Generated article #${articleId - 1}`);
    }
    
    // API 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // 새 기사를 맨 앞에 추가
  existingData.articles = [...newArticles, ...existingData.articles].slice(0, 100);
  
  // 저장
  fs.writeFileSync(articlesPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n✅ Done! Generated ${newArticles.length} new articles.`);
  console.log(`📊 Total articles: ${existingData.articles.length}`);
}

main().catch(console.error);
