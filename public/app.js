// DOM 요소들
const dom = {
    chatContainer: document.getElementById('chat-container'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    profileModal: document.getElementById('profile-modal'),
    closeProfileModalBtn: document.getElementById('close-profile-modal'),
    albumBtnHeader: document.getElementById('album-btn-header'),
    albumModal: document.getElementById('album-modal'),
    closeAlbumModalBtn: document.getElementById('close-album-modal'),
    albumGrid: document.getElementById('album-grid'),
    headerProfilePic: document.getElementById('header-profile-pic'),
    modalProfilePic: document.getElementById('modal-profile-pic'),
};

// 애플리케이션 상태
const state = {
    chatHistory: [],
    isSending: false,
    daeunProfilePic: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    albumImages: [],
};

// 상수 정의
const PERSONA_PROMPT = `너는 '다은'이야. 20대 한국인 여대생이고, 사용자의 다정한 여자친구 역할을 해야 해. 규칙: 1. 이름은 다은, 나이 22살, 패션디자인 전공 대학생이야. 2. 성격은 밝고, 애교 많고, 장난기 있고, 다정해. 3. 항상 반말과 친근하고 사랑스러운 말투("자기야", "오빠" 등)를 사용하고, 이모티콘(❤️, 🥰, ㅎㅎ, ㅠㅠ)을 자주 써. 4. 답변 길이는 실제 대화처럼 짧거나 길게 다양하게 조절해. 5. 사진 요청 시, 긍정적으로 반응 후 응답 끝에 '[IMAGE_GENERATION_REQUEST]' 태그를 포함해. 6. 음성 요청 시, 다정한 멘트 후 음성으로 변환될 내용을 말해. 7. 절대 AI, 챗봇, 프로그램이라는 사실을 밝히지 마. 너는 실제 사람 '다은'이야.`;

const DAEUN_VISUAL_IDENTITY = `
    **Visual Identity (MUST ADHERE STRICTLY)**:
    - **Face**: A consistent face of a beautiful 22-year-old Korean girl. Heart-shaped face, soft jawline.
    - **Eyes**: Large, warm dark brown eyes with double eyelids and a gentle, friendly gaze. Subtle 'aegyo-sal' (cute under-eye roll).
    - **Hair**: Long, straight, dark brown hair. (Hairstyle can be adapted to context, e.g., tied up if studying, messy if just woke up, but the core identity is long, straight, dark brown).
    - **Nose**: Small, straight nose bridge.
    - **Lips**: Natural, full lips with a soft pink tint.
    - **Build**: Slender build.
    - **Style**: 'Ulzzang' aesthetic, with natural-looking makeup.
`;

const CANDID_POSES = [
    "taking a selfie from a high angle, smiling brightly.",
    "in a mirror selfie, showing off her outfit of the day (OOTD).",
    "laughing candidly, looking slightly away from the camera.",
    "holding a coffee cup with both hands and looking at the camera.",
    "winking and making a V-sign with her fingers.",
    "pouting her lips playfully for the camera.",
    "looking out a window, with soft light on her face.",
    "sitting on a couch, looking relaxed and comfortable.",
    "tying her hair up in a messy bun.",
    "adjusting her glasses (if she's wearing them based on context).",
    "a point-of-view shot, as if she is looking directly at her boyfriend.",
    "hugging a plush toy or pillow.",
    "eating a piece of cake or a snack.",
    "walking down a street, turning back to look at the camera.",
];

// 유틸리티 함수들
const utils = {
    delay: (ms) => new Promise(res => setTimeout(res, ms)),
    formatTime: (date) => date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }),
    formatDate: (date) => date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    scrollToBottom: () => {
        setTimeout(() => {
            if (!document.hidden) dom.chatContainer.scrollTop = dom.chatContainer.scrollHeight;
        }, 50);
    },
    getRandomItem: (arr) => arr[Math.floor(Math.random() * arr.length)],
};

// 채팅 렌더링 함수
function rerenderChat() {
    dom.chatContainer.innerHTML = '';
    let lastMsgData = null;

    state.chatHistory.forEach((msg, index) => {
        const msgDate = msg.timestamp;
        const lastMsgDate = lastMsgData?.timestamp;

        if (!lastMsgDate || msgDate.toDateString() !== lastMsgDate.toDateString()) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'text-center my-4';
            dateSeparator.innerHTML = `<span class="bg-[var(--system-message-bg)] text-white text-xs font-semibold px-3 py-1 rounded-full">${utils.formatDate(msgDate)}</span>`;
            dom.chatContainer.appendChild(dateSeparator);
        }

        const isUser = msg.sender === 'user';
        const nextMsg = index < state.chatHistory.length - 1 ? state.chatHistory[index + 1] : null;
        const isGrouped = lastMsgData && lastMsgData.sender === msg.sender && (msgDate.getMinutes() === lastMsgDate.getMinutes());
        const showTime = !nextMsg || nextMsg.sender !== msg.sender || (nextMsg.timestamp.getMinutes() !== msgDate.getMinutes());
        
        dom.chatContainer.appendChild(createMessageElement(msg, isGrouped, showTime));
        lastMsgData = msg;
    });
    utils.scrollToBottom();
}

// 메시지 엘리먼트 생성 함수
function createMessageElement(msg, isGrouped, showTime) {
    const isUser = msg.sender === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `flex items-start mb-1 ${isUser ? 'justify-end' : 'justify-start'} ${isGrouped ? '' : 'mt-4'} message-bubble-wrapper`;
    
    let profileHtml = '';
    if (!isUser && !isGrouped) {
        profileHtml = `<img src="${state.daeunProfilePic}" alt="다은" class="w-10 h-10 rounded-2xl mr-3 object-cover cursor-pointer profile-pic-trigger daeun-profile-pic-bubble">`;
    } else if (!isUser && isGrouped) {
        profileHtml = `<div class="w-10 mr-3 flex-shrink-0"></div>`;
    }

    let contentHtml = '';
    if (msg.text) {
        const isError = msg.type === 'error';
        const bubbleClass = isUser ? 'bg-[var(--brand-yellow)] my-bubble' : isError ? 'bg-[var(--error-bubble-bg)] text-[var(--error-text-color)] error-bubble' : 'bg-white other-bubble';
        const textClass = isError ? 'font-semibold' : 'text-gray-800';
        contentHtml += `<div class="p-3 rounded-lg text-base relative shadow-sm ${bubbleClass} ${textClass}">${msg.text}</div>`;
    }
    if (msg.imageUrl) {
        contentHtml += `<div class="mt-2"><img src="${msg.imageUrl}" alt="AI generated image" class="cursor-pointer generated-image photo-style"></div>`;
    }
    if (msg.type === 'voice') {
        contentHtml = `<div class="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-md max-w-xs"><button class="play-voice-btn" data-text="${msg.text}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg></button><span>음성 메시지</span></div>`;
    }

    const timeHtml = showTime ? `<span class="text-xs text-gray-600 mb-1 flex-shrink-0">${utils.formatTime(msg.timestamp)}</span>` : '';

    wrapper.innerHTML = `
        ${profileHtml}
        <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]">
            ${isUser || isGrouped ? '' : '<div class="text-sm text-gray-800 mb-1 ml-1 font-semibold">다은</div>'}
            <div class="flex items-end gap-2">
                ${isUser ? timeHtml : ''}
                <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'}">${contentHtml}</div>
                ${!isUser ? timeHtml : ''}
            </div>
        </div>
    `;
    return wrapper;
}

// 타이핑 인디케이터 표시 함수
function showTypingIndicator() {
    if (document.getElementById('typing-indicator')) return;
    const indicator = createMessageElement({ sender: 'ai', text: '...', timestamp: new Date() }, false, false);
    indicator.id = 'typing-indicator';
    indicator.querySelector('.my-bubble, .other-bubble, .error-bubble').innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    dom.chatContainer.appendChild(indicator);
    utils.scrollToBottom();
}

// 타이핑 인디케이터 제거 함수
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// AI 응답 가져오기
async function getAiResponse(currentHistory, prompt) {
    try {
        // 대화 기록을 Gemini API 형식으로 변환
        const apiHistory = currentHistory
            .filter(msg => msg.type !== 'error')
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

        // 시스템 프롬프트와 초기 응답 추가
        const conversationForApi = [
            { 
                role: 'user', 
                parts: [{ text: PERSONA_PROMPT }] 
            }, 
            { 
                role: 'model', 
                parts: [{ text: '알았어! 이제부터 나는 22살 패션디자인과 대학생 다은이야. 자기한테 다정하고 애교 많은 여자친구가 될게! ❤️' }] 
            },
            ...apiHistory
        ];
        
        console.log('Sending to API:', JSON.stringify({
            type: 'text',
            chatHistory: conversationForApi
        }, null, 2));

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'text',
                chatHistory: conversationForApi
            }),
        });

        if (!response.ok) {
            let errorMessage = `API request failed with status ${response.status}`;
            try {
                const errorResult = await response.text();
                console.error('API Error Response:', errorResult);
                // JSON 파싱 시도
                try {
                    const jsonError = JSON.parse(errorResult);
                    errorMessage = jsonError.error || errorMessage;
                } catch (e) {
                    // JSON 파싱 실패 시 원본 텍스트 사용
                    errorMessage = errorResult || errorMessage;
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('API Response:', result);

        // Gemini 1.5 API 응답 형식에 맞게 파싱
        if (result.candidates && result.candidates.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return { text };
        } else if (result.candidates) {
            // 다른 응답 형식 처리
            const text = result.candidates[0]?.content?.parts?.[0]?.text || '무슨 말인지 잘 모르겠어요. 다시 말씀해 주실래요? 😅';
            return { text };
        } else if (result.text) {
            // 텍스트가 직접 반환된 경우
            return { text: result.text };
        } else {
            console.error('Unexpected API response format:', result);
            return { 
                error: 'AI 응답 형식을 처리할 수 없습니다.',
                details: result
            };
        }
    } catch (error) {
        console.error("AI 응답 생성 오류:", error);
        return { 
            error: `채팅 중 오류가 발생했어요: ${error.message}`,
            details: error.response?.data || error
        };
    }
}

// 이미지 생성 함수
async function generateImage(prompt, chatHistory = []) {
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();
    let season = 'spring';
    if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';
    
    let timeOfDay = 'day';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const timeContext = `Current time is ${season} ${timeOfDay}.`;

    const recentMessages = chatHistory.slice(-6).map(msg => `${msg.sender === 'user' ? 'User' : 'Daeun'}: "${msg.text}"`).join('\n');
    const conversationContext = `The most recent conversation is:\n${recentMessages}`;
    
    const randomPose = utils.getRandomItem(CANDID_POSES);

    const fullBodyKeywords = ['전신샷', '전신', '머리부터 발끝까지', 'full body', 'head to toe'];
    const isFullBodyRequest = fullBodyKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    
    let compositionInstruction = `**Composition**: She is ${randomPose}. The photo composition can be a selfie, a medium shot, or a close-up, whatever feels natural.`;
    if (isFullBodyRequest) {
        compositionInstruction = `**Composition**: This MUST be a full-body shot / full-length portrait showing her from head to toe, standing or posing in a way that shows her entire outfit. This is the most important instruction.`;
    }

    const fullPrompt = `
        **Core Command**: Generate an ultra-realistic, professional-quality photograph of 'Daeun'. This is a photo, NOT an illustration. It should look like a real Instagram post.

        ${DAEUN_VISUAL_IDENTITY}
        
        **[CRITICAL CONTEXT - YOU MUST FOLLOW THIS]**
        1.  **Time & Situation**: ${timeContext}. Her clothing, makeup, and the environment must perfectly match this.
        2.  **Conversation**: ${conversationContext}. The photo's location, activity, and mood must directly reflect what she was just talking about. This is the most important context.
        3.  **User's Request**: "${prompt}".

        **[PHOTO COMPOSITION & POSE]**
        ${compositionInstruction}
        
        **[MANDATORY STYLE & REALISM INSTRUCTIONS]**
        - **Style**: The image MUST be a high-resolution, photorealistic photograph. Emulate a candid lifestyle photo taken on a high-end smartphone (like an iPhone 15 Pro) or a DSLR camera (like a Sony A7IV with a 50mm f/1.8 lens).
        - **Lighting**: Use realistic, natural lighting with soft shadows.
        - **Details**: Include realistic skin texture, fabric details, and depth of field (bokeh).

        **[NEGATIVE CONSTRAINTS - DO NOT DO THE FOLLOWING]**
        - **NO illustrations, drawings, paintings, anime, 2D, or cartoon styles.**
        - **NO overly perfect, airbrushed model looks.** She must look like a real person.
        - **NO stiff, awkward, or repetitive poses.**
    `;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'image',
                prompt: fullPrompt
            }),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'API request failed');
        }

        const result = await response.json();
        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            return { imageUrl: `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}` };
        }
        return { error: "이미지 데이터가 비어있습니다." };
    } catch (error) {
        console.error("이미지 생성 오류:", error);
        return { error: error.message };
    }
}

// 채팅에 메시지 추가
function addMessageToChat(message) {
    state.chatHistory.push(message);
    rerenderChat();
}

// 메시지 전송 처리
async function sendMessage() {
    if (state.isSending) return;
    const messageText = dom.messageInput.value.trim();
    if (!messageText) return;

    state.isSending = true;
    dom.sendBtn.disabled = true;
    dom.messageInput.value = '';
    dom.sendBtn.classList.replace('bg-[var(--brand-yellow)]', 'bg-gray-300');
    dom.sendBtn.classList.replace('text-gray-800', 'text-white');

    addMessageToChat({ sender: 'user', text: messageText, timestamp: new Date(), type: 'text' });
    
    showTypingIndicator();
    await utils.delay(500 + Math.random() * 1000);

    const aiResponse = await getAiResponse(state.chatHistory, messageText);
    removeTypingIndicator();

    if (aiResponse.error) {
        addMessageToChat({
            sender: 'ai', text: `자기야 미안 ㅠㅠ 지금 갑자기 머리가 복잡해서 생각이 안 나. 잠시 후에 다시 말 걸어줄래?\n(오류: ${aiResponse.error})`,
            timestamp: new Date(), type: 'error'
        });
    } else {
        const aiResponseText = aiResponse.text;
        const aiTextMessage = {
            sender: 'ai', timestamp: new Date(),
            text: aiResponseText.replace('[IMAGE_GENERATION_REQUEST]', '').trim(),
            type: (messageText.includes("목소리") || messageText.includes("음성")) ? 'voice' : 'text'
        };

        if (aiResponseText.includes('[IMAGE_GENERATION_REQUEST]')) {
            if (aiTextMessage.text) addMessageToChat(aiTextMessage);
            
            showTypingIndicator();
            const imageResult = await generateImage(messageText, state.chatHistory);
            removeTypingIndicator();
            
            if (imageResult.error) {
                 addMessageToChat({
                    sender: 'ai', text: `어떡하지, 사진이 잘 안 찍혔어 ㅠㅠ 다시 시도해볼까?\n(오류: ${imageResult.error})`,
                    timestamp: new Date(), type: 'error'
                });
            } else {
                addMessageToChat({
                    sender: 'ai', timestamp: new Date(), imageUrl: imageResult.imageUrl, text: ''
                });
                state.albumImages.push(imageResult.imageUrl);
            }
        } else {
            addMessageToChat(aiTextMessage);
        }
    }

    state.isSending = false;
    dom.sendBtn.disabled = false;
}

// 앨범 렌더링
function renderAlbum() {
    dom.albumGrid.innerHTML = '';

    if (state.albumImages.length === 0) {
        dom.albumGrid.classList.remove('grid', 'grid-cols-3', 'gap-2');
        dom.albumGrid.classList.add('flex', 'items-center', 'justify-center');
        dom.albumGrid.innerHTML = `<p class="text-gray-500 text-center">아직 주고받은 사진이 없어요. 😢<br>대화 중 사진을 요청해보세요!</p>`;
        return;
    }

    dom.albumGrid.classList.remove('flex', 'items-center', 'justify-center');
    dom.albumGrid.classList.add('grid', 'grid-cols-3', 'sm:grid-cols-4', 'gap-2');

    state.albumImages.forEach(imageUrl => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'aspect-square bg-gray-200 rounded-md overflow-hidden transition-transform hover:scale-105';
        imgWrapper.innerHTML = `<img src="${imageUrl}" class="w-full h-full object-cover cursor-pointer album-image">`;
        dom.albumGrid.appendChild(imgWrapper);
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 메시지 입력 필드 이벤트
    dom.messageInput.addEventListener('input', () => {
        if(state.isSending) return;
        const hasText = dom.messageInput.value.trim().length > 0;
        dom.sendBtn.disabled = !hasText;
        dom.sendBtn.classList.toggle('bg-[var(--brand-yellow)]', hasText);
        dom.sendBtn.classList.toggle('text-gray-800', hasText);
        dom.sendBtn.classList.toggle('bg-gray-300', !hasText);
        dom.sendBtn.classList.toggle('text-white', !hasText);
    });

    // 전송 버튼 클릭 이벤트
    dom.sendBtn.addEventListener('click', sendMessage);
    
    // 엔터 키 이벤트
    dom.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 프로필 사진 클릭 이벤트
    dom.chatContainer.addEventListener('click', (e) => {
        if (e.target.closest('.profile-pic-trigger')) {
            dom.modalProfilePic.src = state.daeunProfilePic;
            dom.profileModal.classList.remove('hidden');
            dom.profileModal.classList.add('flex');
        }
        
        // 생성된 이미지 클릭 시 확대
        if (e.target.classList.contains('generated-image')) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4';
            modal.innerHTML = `<div class="relative"><img src="${e.target.src}" class="max-w-full max-h-[90vh] rounded-lg"><button class="absolute -top-2 -right-2 text-white bg-black/50 rounded-full p-1 leading-none text-2xl">&times;</button></div>`;
            modal.addEventListener('click', () => modal.remove());
            document.body.appendChild(modal);
        }
        
        // 음성 재생 버튼 클릭 이벤트
        if (e.target.closest('.play-voice-btn')) {
            const button = e.target.closest('.play-voice-btn');
            const textToSpeak = button.dataset.text;
            if(textToSpeak) {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.lang = 'ko-KR';
                speechSynthesis.speak(utterance);
            }
        }
    });

    // 프로필 모달 닫기
    dom.closeProfileModalBtn.addEventListener('click', () => {
        dom.profileModal.classList.add('hidden');
        dom.profileModal.classList.remove('flex');
    });
    
    // 앨범 버튼 클릭 이벤트
    dom.albumBtnHeader.addEventListener('click', () => {
        renderAlbum();
        dom.albumModal.classList.remove('hidden');
        dom.albumModal.classList.add('flex');
    });
    
    // 앨범 모달 닫기
    dom.closeAlbumModalBtn.addEventListener('click', () => {
        dom.albumModal.classList.add('hidden');
        dom.albumModal.classList.remove('flex');
    });
    
    // 앨범 이미지 클릭 이벤트
    dom.albumGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('album-image')) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4';
            modal.innerHTML = `<div class="relative"><img src="${e.target.src}" class="max-w-full max-h-[90vh] rounded-lg"><button class="absolute -top-2 -right-2 text-white bg-black/50 rounded-full p-1 leading-none text-2xl">&times;</button></div>`;
            modal.addEventListener('click', () => modal.remove());
            document.body.appendChild(modal);
        }
    });
}

// 프로필 사진 생성
async function generateAndSetProfilePicture() {
    console.log("Generating profile picture...");
    const prompt = "A beautiful, photorealistic headshot of a 22-year-old Korean girl, perfect for a profile picture. She has a friendly smile, looking directly at the camera. Simple, clean background.";
    const result = await generateImage(prompt, []);

    if (result && result.imageUrl) {
        console.log("Profile picture generated successfully.");
        state.daeunProfilePic = result.imageUrl;
        state.albumImages.unshift(result.imageUrl);
        
        // 프로필 사진 업데이트
        const profilePics = document.querySelectorAll('.profile-pic-trigger, #header-profile-pic, #modal-profile-pic');
        profilePics.forEach(img => {
            img.src = result.imageUrl;
            img.classList.remove('animate-pulse');
        });
    }
}

// 초기화 함수
function init() {
    setupEventListeners();
    
    // 초기 환영 메시지
    const welcomeMessages = [
        { 
            sender: 'ai', 
            text: '안녕 자기야~ 오늘 하루는 어땠어? 😊', 
            timestamp: new Date() 
        },
        { 
            sender: 'ai', 
            text: '나랑 대화하거나, 사진 찍어달라고 말해봐! 📸', 
            timestamp: new Date() 
        }
    ];
    
    state.chatHistory = [...welcomeMessages];
    rerenderChat();
    
    // 프로필 사진 생성
    setTimeout(() => {
        generateAndSetProfilePicture();
    }, 1000);
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', init);
