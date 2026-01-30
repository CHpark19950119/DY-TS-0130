// ===== 기사 자동 생성 스크립트 =====
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// RSS 소스
const RSS_SOURCES = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', category: 'economy', source: 'Reuters' },
  { url: 'https://feeds.reuters.com/Reuters/worldNews', category: 'politics', source: 'Reuters' },
  { url: 'https://feeds.reuters.com/reuters/technologyNews', category: 'tech', source: 'Reuters' },
  { url: 'https://feeds.reuters.com/reuters/healthNews', category: 'health', source: 'Reuters' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'politics', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'economy', source: 'BBC' },
];

async function fetchRSS(url) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await response.text();
    const items = [];
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    for (const item of itemMatches.slice(0, 3)) {
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
    console.error(`RSS error (${url}):`, error.message);
    return [];
  }
}

async function expandArticle(title, summary, category, source) {
  const prompt = `You are a Reuters/Bloomberg journalist. Write a 350-450 word English news article.

Title: ${title}
Summary: ${summary}
Category: ${category}

Requirements:
1. Formal journalistic English
2. Include numbers, dates, expert quotes
3. Structure: Lead → Body → Quote → Outlook

Respond with JSON only:
{
  "content": "English article (350-450 words)",
  "koreanContent": "한국어 번역",
  "level": "intermediate|advanced|expert",
  "keyTerms": [{"en": "term", "ko": "용어"}]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Article expansion error:', error.message);
  }
  return null;
}

async function main() {
  console.log('📰 Starting article generation...');
  
  const articlesPath = path.join(__dirname, '..', 'data', 'articles.json');
  let existingData = { articles: [], categories: [], levels: [] };
  
  try {
    existingData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } catch (e) {
    console.log('Creating new articles.json');
  }
  
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
  
  for (const source of RSS_SOURCES.slice(0, 4)) {
    console.log(`\n📡 Fetching from ${source.source} (${source.category})...`);
    const items = await fetchRSS(source.url);
    
    if (items.length === 0) continue;
    
    const item = items[0];
    console.log(`  Processing: ${item.title.substring(0, 50)}...`);
    
    const expanded = await expandArticle(item.title, item.summary, source.category, source.source);
    
    if (expanded && expanded.content) {
      newArticles.push({
        id: articleId++,
        title: item.title,
        summary: item.summary,
        content: expanded.content,
        koreanContent: expanded.koreanContent || '',
        category: source.category,
        level: expanded.level || 'advanced',
        source: source.source,
        keyTerms: expanded.keyTerms || [],
        wordCount: expanded.content.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      });
      console.log(`  ✅ Generated article #${articleId - 1}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  existingData.articles = [...newArticles, ...existingData.articles].slice(0, 100);
  fs.writeFileSync(articlesPath, JSON.stringify(existingData, null, 2));
  
  console.log(`\n✅ Done! Generated ${newArticles.length} new articles.`);
}

main().catch(console.error);
