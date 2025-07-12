// 이 파일은 Vercel 서버에서만 실행됩니다.
// 따라서 process.env.GEMINI_API_KEY는 사용자에게 노출되지 않습니다.

export default async function handler(req, res) {
  // 1. POST 요청이 아니면 에러 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 프론트엔드에서 보낸 요청 데이터 (타입, 프롬프트, 대화기록)를 받음
    const { type, prompt, chatHistory } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key is not set' });
    }

    let apiUrl;
    let payload;

    // 3. 요청 타입에 따라 Gemini API 주소와 요청 데이터를 다르게 설정
    if (type === 'text') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      payload = {
        contents: chatHistory,
        // 안전 설정 추가
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      };
    } else if (type === 'image') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      payload = {
        instances: [{ prompt: prompt }],
        parameters: { "sampleCount": 1 }
      };
    } else {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    // 4. 서버에서 Gemini API로 실제 요청 전송
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error:', errorBody);
      throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // 5. 성공 결과를 프론트엔드로 다시 전송
    res.status(200).json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: error.message });
  }
}
