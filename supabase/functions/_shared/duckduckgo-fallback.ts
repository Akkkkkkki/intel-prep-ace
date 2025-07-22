// DuckDuckGo Search Fallback (inspired by Aston AI multi-engine pattern)
// Simple fallback when Tavily API fails or hits rate limits

import { searchTavily } from "./tavily-client.ts";

interface DuckDuckGoResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchDuckDuckGo(
  query: string,
  maxResults: number = 10
): Promise<{ results: DuckDuckGoResult[] } | null> {
  try {
    // Use DuckDuckGo's instant answer API (free tier)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterviewPrepBot/1.0)'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Extract results from DuckDuckGo format
    const results: DuckDuckGoResult[] = [];
    
    // Add instant answer if available
    if (data.Answer) {
      results.push({
        title: data.Heading || 'Direct Answer',
        url: data.AbstractURL || '',
        snippet: data.Answer
      });
    }
    
    // Add related topics
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, maxResults - results.length).forEach((topic: any) => {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text
          });
        }
      });
    }
    
    return { results: results.slice(0, maxResults) };
    
  } catch (error) {
    console.warn('DuckDuckGo fallback search failed:', error);
    return null;
  }
}

// Enhanced search with fallback pattern (Aston AI inspired)
export async function searchWithFallback(
  tavilyApiKey: string,
  query: string,
  maxResults: number = 10
): Promise<any> {
  try {
    // Try Tavily first (your primary engine)
    console.log('Attempting Tavily search...');
    const tavilyResult = await searchTavily(tavilyApiKey, {
      query,
      searchDepth: 'basic',
      maxResults,
      includeAnswer: true,
      includeRawContent: false
    });
    
    if (tavilyResult && tavilyResult.results && tavilyResult.results.length > 0) {
      return tavilyResult;
    }
    
  } catch (error) {
    console.warn('Tavily search failed, falling back to DuckDuckGo:', error);
  }
  
  // Fallback to DuckDuckGo
  console.log('Using DuckDuckGo fallback...');
  const duckResult = await searchDuckDuckGo(query, maxResults);
  
  if (duckResult) {
    // Convert DuckDuckGo format to Tavily-compatible format
    return {
      query,
      answer: `Results from DuckDuckGo search for: ${query}`,
      results: duckResult.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.snippet,
        raw_content: result.snippet,
        score: 0.5, // Default score for fallback results
        published_date: null
      }))
    };
  }
  
  return null;
}