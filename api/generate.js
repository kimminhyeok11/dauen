import { GoogleGenerativeAI } from '@google/generative-ai';

// 이 파일은 Vercel 서버에서만 실행됩니다.
// 환경 변수에서 API 키 가져오기
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req, res) {
  // 1. CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 2. OPTIONS 메소드에 대한 사전 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. POST 요청이 아니면 에러 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('Request received:', {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body, null, 2)
  });

  try {
    const { type, prompt, chatHistory, fullPrompt } = req.body;
    
    // 4. 필수 파라미터 검증
    if (!type || (type === 'text' && !chatHistory) || (type === 'image' && !prompt)) {
      console.error('Missing required parameters:', { type, prompt, chatHistory });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Using API Key:', apiKey ? 'Key is set' : 'Key is missing');
    console.log('Request type:', type);
    
    if (chatHistory) {
      console.log('Chat history length:', chatHistory.length);
    }

    // 5. 요청 타입에 따라 처리
    if (type === 'text') {
      return handleTextGeneration(req, res, chatHistory);
    } else if (type === 'image') {
      return handleImageGeneration(req, res, prompt, fullPrompt || prompt);
    } else {
      return res.status(400).json({ error: 'Invalid request type' });
    }
  } catch (error) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
}

// 텍스트 생성 처리
async function handleTextGeneration(req, res, chatHistory) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // 대화 기록을 Gemini API 형식으로 변환
    const history = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.parts[0].text }]
    }));
    
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(history[history.length - 1].parts[0].text);
    const response = await result.response;
    const text = response.text();
    
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text }]
        }
      }]
    });
  } catch (error) {
    console.error('Error in text generation:', error);
    return res.status(500).json({ 
      error: 'Text generation failed',
      details: error.message 
    });
  }
}

// 이미지 생성 처리
async function handleImageGeneration(req, res, prompt, fullPrompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: fullPrompt },
        ],
      }],
    });
    
    const response = await result.response;
    const text = response.text();
    
    // 이미지 URL이 포함된 텍스트 응답 반환
    // 실제로는 이미지 생성 API를 사용하거나, base64 인코딩된 이미지를 반환해야 함
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{
            text: text,
            // 실제 구현에서는 여기에 이미지 데이터나 URL을 포함시킵니다.
            // 예: inlineData: { data: base64Image, mimeType: 'image/png' }
          }]
        }
      }]
    });
  } catch (error) {
    console.error('Error in image generation:', error);
    return res.status(500).json({ 
      error: 'Image generation failed',
      details: error.message 
    });
  }
}
      payload = {
        contents,
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          stopSequences: [],
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      };
    } else if (type === 'image') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;
      payload = {
        contents: [{
          parts: [
            { text: `이미지 생성 요청: ${prompt}. 반드시 이미지 생성 태그를 포함해주세요.` },
          ]
        }]
      };
    } else {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    console.log('Sending request to Gemini API:', { apiUrl, payload: JSON.stringify(payload).substring(0, 200) + '...' });

    console.log('Sending request to Gemini API:', {
      url: apiUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2)
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Raw response from Gemini API:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
    }
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(response.status).json({
        error: 'Gemini API request failed',
        status: response.status,
        details: data
      });
    }
    
    console.log('Sending response to client:', JSON.stringify(data, null, 2));
    
    // 5. 성공 결과를 프론트엔드로 전송
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
