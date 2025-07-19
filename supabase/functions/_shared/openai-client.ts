// Shared OpenAI client utility for consistent API interactions across functions

export interface OpenAIRequest {
  model: string;
  prompt: string;
  systemPrompt: string;
  maxTokens: number;
  temperature?: number;
  useJsonMode?: boolean;
}

export interface OpenAIResponse {
  content: string;
  raw: any;
}

export async function callOpenAI(
  apiKey: string,
  request: OpenAIRequest
): Promise<OpenAIResponse> {
  const body: any = {
    model: request.model,
    messages: [
      {
        role: 'system',
        content: request.systemPrompt
      },
      {
        role: 'user',
        content: request.prompt
      }
    ],
    max_tokens: request.maxTokens,
    temperature: request.temperature || 0.3,
  };

  // Add JSON mode if requested
  if (request.useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  return {
    content,
    raw: data
  };
}

export function parseJsonResponse<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error("Failed to parse OpenAI JSON response:", parseError);
    console.error("Raw response:", content);
    return fallback;
  }
}