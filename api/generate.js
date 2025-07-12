// 이 파일은 Vercel 서버에서만 실행됩니다.
// 따라서 process.env.GEMINI_API_KEY는 사용자에게 노출되지 않습니다.

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
    // 2. 프론트엔드에서 보낸 요청 데이터 (타입, 프롬프트, 대화기록)를 받음
    const { type, prompt, chatHistory } = req.body;
    
    // 3. 필수 파라미터 검증
    if (!chatHistory) {
      console.error('Missing required parameters:', { type, prompt, chatHistory });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 4. API 키 설정 (테스트용 하드코딩)
    const apiKey = 'AIzaSyBcMKVcue0m4OpJ1qLDd2h9T5j1w6lzt6k';
    
    console.log('Using new API Key:', apiKey ? 'Key is set' : 'Key is missing');
    console.log('Request type:', type);
    console.log('Chat history length:', chatHistory.length);

    let apiUrl;
    let payload;

    // 3. 요청 타입에 따라 Gemini API 주소와 요청 데이터를 다르게 설정
    if (type === 'text') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      // 대화 기록이 유효한지 확인하고, 없으면 기본 대화로 초기화
      const contents = Array.isArray(chatHistory) && chatHistory.length > 0 
        ? chatHistory 
        : [
            { role: 'user', parts: [{ text: '안녕! 너는 누구야?' }] },
            { role: 'model', parts: [{ text: '안녕! 나는 다은이야. 만나서 반가워! 😊' }] }
          ];
          
      console.log('Sending to Gemini API with contents:', JSON.stringify(contents, null, 2));

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
