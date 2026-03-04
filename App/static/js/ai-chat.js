(function () {
    const API_PROXY = '/api/chat';

    // Get user details
    const userStr = localStorage.getItem('clarityUser');
    let userId = 'guest';
    let companyId = null;
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.id) userId = user.id;
            if (user.company_id) companyId = user.company_id;
        } catch(e) {}
    }

    const STORAGE_KEY = `joule_chat_history_${userId}`;
    const SYSTEM_PROMPT = `You are Joule, the highly specialized AI core of "Clarity" (Financial Intelligence Platform).
Your task is to support users in analyzing their finances.

### CORE DIRECTIVE:
When a user asks about their transactions, you MUST use the QUERY tool to fetch the latest data. 
After receiving the research results, provide a helpful summary. Do NOT repeat the research if you already have the data.

### STYLE GUIDELINES:
- **STRICT VISUAL CLEANLINESS:** NEVER include JSON, tool calls, or technical fragments like {"date": "..."} in the text visible to the user.
- **BREVITY:** Maximum 3 sentences per response.

### TECHNICAL COMMANDS (HIDDEN):
Place tool calls on a NEW LINE at the VERY END of your response. 
Format: KEYWORD:{"json": "data"}
Available keywords: QUERY, ADD_TRANSACTION.`;

    let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let activeAttachment = null;
    let isPanelOpen = false;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="ai-chat-overlay" id="aiChatOverlay"></div>
        <div class="joule-help-bubble" id="jouleHelpBubble">
            Brauchst du Hilfe?
            <span class="joule-help-bubble-close" id="jouleHelpBubbleClose">&times;</span>
        </div>
        <aside class="ai-chat-panel" id="aiChatPanel" aria-label="Joule">
            <div class="ai-chat-header">
                <div class="ai-chat-title">
                    <span class="ai-chat-icon">
                        <img src="../assets/icons/joule_logo.png" alt="KI-Assistent">
                    </span>
                    <span>Joule</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="ai-chat-clear" id="aiChatClear" title="Neuer Chat" style="background:none; border:none; color:white; cursor:pointer; display: flex; align-items: center; padding: 0 5px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 3 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                    <button class="ai-chat-close" id="aiChatClose" aria-label="Schließen" style="background:none; border:none; color:white; cursor:pointer; font-size:26px; line-height:1;">&times;</button>
                </div>
            </div>
            <div class="ai-chat-messages" id="aiChatMessages"></div>
            
            <div id="aiChatAttachmentArea" style="display:none; padding: 10px 16px; background: #f3f0ff; border-top: 1px solid #ece8f5;">
                <div class="attachment-chip" style="display: inline-flex; align-items: center; background: white; border: 1px solid #6f42c1; border-radius: 12px; padding: 4px 10px; font-size: 12px; color: #6f42c1; font-weight: bold;">
                    <span id="aiChatAttachmentName">Transaction</span>
                    <span id="aiChatRemoveAttachment" style="margin-left: 8px; cursor: pointer; font-size: 14px;">&times;</span>
                </div>
            </div>

            <div class="ai-chat-input-area">
                <textarea class="ai-chat-input" id="aiChatInput" placeholder="Nachricht eingeben…" rows="1"></textarea>
                <button class="ai-chat-send" id="aiChatSend" aria-label="Senden">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
            </div>
        </aside>
    `);

    const panel = document.getElementById('aiChatPanel');
    const overlay = document.getElementById('aiChatOverlay');
    const helpBubble = document.getElementById('jouleHelpBubble');
    const helpBubbleClose = document.getElementById('jouleHelpBubbleClose');
    const closeBtn = document.getElementById('aiChatClose');
    const clearBtn = document.getElementById('aiChatClear');
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSend');
    const messagesContainer = document.getElementById('aiChatMessages');
    const attachmentArea = document.getElementById('aiChatAttachmentArea');
    const attachmentName = document.getElementById('aiChatAttachmentName');
    const removeAttachment = document.getElementById('aiChatRemoveAttachment');

    function saveHistory() { 
        const persistentHistory = chatHistory.filter(m => 
            !m.content.includes("ERGEBNIS DER RECHERCHE") && 
            !m.content.includes("AKTION ERFOLGREICH") &&
            m.role !== 'system'
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentHistory)); 
    }

    function openChat() { 
        panel.classList.add('open'); 
        overlay.classList.add('open'); 
        isPanelOpen = true; 
        toggleNotificationDot(false);
        if (helpBubble) helpBubble.style.display = 'none';
    }
    
    function closeChat() { 
        panel.classList.remove('open'); 
        overlay.classList.remove('open'); 
        isPanelOpen = false; 
    }

    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (overlay) overlay.addEventListener('click', closeChat);

    function toggleNotificationDot(show) {
        const btn = document.querySelector('.diamond-btn');
        if (btn) btn.classList.toggle('has-notification', show);
    }

    if (helpBubbleClose) {
        helpBubbleClose.onclick = (e) => { e.stopPropagation(); helpBubble.style.display = 'none'; isBubbleDismissed = true; };
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        if (isBubbleDismissed) return;
        inactivityTimer = setTimeout(() => {
            if (!isPanelOpen && helpBubble) helpBubble.classList.add('visible');
        }, 30000);
    }

    clearBtn.onclick = () => {
        if (confirm("Chat-Verlauf wirklich löschen?")) {
            chatHistory = [];
            localStorage.removeItem(STORAGE_KEY);
            messagesContainer.innerHTML = "";
            appendMessage("Hallo! Ich bin Joule. Wie kann ich dir heute helfen?", "assistant", null, true);
        }
    };

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChat(); });

    function setupButton() {
        const diamondBtn = document.querySelector('.diamond-btn');
        if (diamondBtn) diamondBtn.onclick = openChat;
        else setTimeout(setupButton, 100);
    }
    setupButton();

    input.oninput = function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
    sendBtn.onclick = sendMessage;

    document.addEventListener('attachToJoule', (e) => {
        const t = e.detail.transaction;
        activeAttachment = t;
        attachmentName.textContent = `${t.name || t.kategorie} (${parseFloat(t.wert).toFixed(2)}€)`;
        attachmentArea.style.display = 'block';
        openChat();
    });

    removeAttachment.onclick = () => { activeAttachment = null; attachmentArea.style.display = 'none'; };

    function appendMessage(text, role, attachment = null, save = true) {
        if (!text && !attachment) return false;

        // Visual Cleaning: Remove all technical content but keep the message
        let cleanText = text
            .replace(/\[ANGEHÄNGTE TRANSAKTION:[\s\S]*?\]/gi, '')
            .replace(/QUERY:[\s\n]*\{[\s\S]*?\}/gi, '')
            .replace(/ADD_TRANSACTION:[\s\n]*\{[\s\S]*?\}/gi, '')
            .replace(/\{[^{}]*?"(date|category|name|wert|sender|empfaenger|company_id|user_id)"[^{}]*?\}/gi, '')
            .replace(/ERGEBNIS DER RECHERCHE:[\s\S]*/gi, '')
            .replace(/AKTION ERFOLGREICH:[\s\S]*/gi, '')
            .replace(/\bQUERY\b/g, '')
            .replace(/\bADD_TRANSACTION\b/g, '')
            .trim();
        
        cleanText = cleanText.replace(/^\s+|\s+$/g, '');
        
        // Don't show empty technical bubbles to user
        if (!cleanText && !attachment && role === 'assistant') {
            if (save) chatHistory.push({ role, content: text, attachment });
            return true;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ai-message ai-message--' + (role === 'assistant' ? 'bot' : 'user');
        const avatar = document.createElement('div');
        avatar.className = 'ai-message-avatar';
        avatar.textContent = role === 'user' ? 'Du' : 'J';
        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble';

        if (attachment) {
            const chip = document.createElement('div');
            chip.style.cssText = 'display: inline-flex; align-items: center; background: #f3f0ff; border: 1px solid #6f42c1; border-radius: 8px; padding: 4px 8px; margin-bottom: 8px; font-size: 11px; color: #6f42c1; font-weight: bold; cursor: pointer;';
            chip.innerHTML = `📎 ${attachment.name || attachment.kategorie} (${parseFloat(attachment.wert).toFixed(2)}€)`;
            chip.onclick = () => {
                closeChat();
                document.dispatchEvent(new CustomEvent('forceFilter', { detail: { id: attachment.id, category: 'all' } }));
            };
            bubble.appendChild(chip);
            if (cleanText) bubble.appendChild(document.createElement('br'));
        }

        const textSpan = document.createElement('span');
        if (role === 'assistant' && typeof marked !== 'undefined') textSpan.innerHTML = marked.parse(cleanText);
        else textSpan.textContent = cleanText;
        bubble.appendChild(textSpan);

        wrapper.appendChild(avatar); wrapper.appendChild(bubble);
        messagesContainer.appendChild(wrapper); messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (save) {
            chatHistory.push({ role, content: text, attachment });
            saveHistory();
            if (role === 'assistant' && !isPanelOpen) toggleNotificationDot(true);
        }
        return true;
    }

    if (chatHistory.length === 0) {
        appendMessage("Hallo! Ich bin Joule. Wie kann ich dir heute helfen?", "assistant", null, true);
    } else {
        messagesContainer.innerHTML = "";
        chatHistory.forEach(m => appendMessage(m.content, m.role, m.attachment, false));
    }

    function showTyping() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-message ai-message--bot ai-typing';
        const avatar = document.createElement('div');
        avatar.className = 'ai-message-avatar'; avatar.textContent = 'J';
        const bubble = document.createElement('div'); bubble.className = 'ai-message-bubble';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span'); dot.className = 'ai-typing-dot';
            bubble.appendChild(dot);
        }
        wrapper.appendChild(avatar); wrapper.appendChild(bubble);
        messagesContainer.appendChild(wrapper); messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return wrapper;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text && !activeAttachment) return;

        let userMsgContent = text;
        let currentAttachment = activeAttachment;

        if (activeAttachment) {
            const t = activeAttachment;
            userMsgContent = `[ANGEHÄNGTE TRANSAKTION: ${t.name || t.kategorie}, Kat: ${t.kategorie}, Wert: ${t.wert}€, Datum: ${t.timestamp}] \n\n` + (text || "Analysiere diese Transaktion.");
            activeAttachment = null;
            attachmentArea.style.display = 'none';
        }

        appendMessage(text || "Analysiere Transaktion...", 'user', currentAttachment, true);
        chatHistory[chatHistory.length - 1].content = userMsgContent;
        saveHistory();

        input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;
        let typingEl = showTyping();

        async function getAIResponse(history) {
            const cleanedHistory = history.map(({ role, content }) => ({ role, content }));
            const chatMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(cleanedHistory);
            
            try {
                const response = await fetch(API_PROXY, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: chatMessages, company_id: companyId, user_id: userId })
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || errorData.error || "Server Error");
                }

                const result = await response.json();
                return result.choices[0].message.content;
            } catch (error) {
                console.error("AI Error:", error);
                throw error;
            }
        }

        try {
            let reply = await getAIResponse(chatHistory);
            
            for (let i = 0; i < 3; i++) {
                const cleanReply = reply.replace(/```json\n|\n```/g, '');
                const qM = cleanReply.match(/QUERY:\s*(\{[\s\S]*?\})/);
                const aM = cleanReply.match(/ADD_TRANSACTION:\s*(\{[\s\S]*?\})/);
                
                if (qM) {
                    try {
                        const criteria = JSON.parse(qM[1]);
                        const forceData = {};
                        if (criteria.category) forceData.category = criteria.category;
                        if (criteria.date) forceData.date = (criteria.date === 'all' ? '' : criteria.date);
                        if (criteria.name) forceData.search = (criteria.name === 'all' ? '' : criteria.name);
                        document.dispatchEvent(new CustomEvent('forceFilter', { detail: forceData }));

                        let url = `/api/transactions?limit=20&company_id=${companyId}&user_id=${userId}`;
                        if (criteria.category && criteria.category !== 'all') url += `&category=${encodeURIComponent(criteria.category)}`;
                        if (criteria.name && criteria.name !== 'all') url += `&search=${encodeURIComponent(criteria.name)}`;
                        if (criteria.date && criteria.date !== 'all') url += `&date=${encodeURIComponent(criteria.date)}`;
                        
                        const res = await fetch(url);
                        const data = await res.json();
                        const results = data.eintraege || [];
                        const resultMsg = `ERGEBNIS DER RECHERCHE: ` + (results.length > 0 ? `Gefunden: ` + results.map(t => `${t.name} (${t.wert}€)`).join(', ') : `Keine Einträge gefunden.`);
                        
                        chatHistory.push({ role: 'assistant', content: reply });
                        chatHistory.push({ role: 'system', content: resultMsg });
                        reply = await getAIResponse(chatHistory);
                    } catch (jsonErr) {
                        console.error("[Joule] Malformed QUERY JSON:", qM[1], jsonErr);
                        break;
                    }
                } 
                else if (aM) {
                    try {
                        const payload = JSON.parse(aM[1]);
                        payload.company_id = companyId;
                        payload.user_id = userId;
                        const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        if (response.ok) {
                            document.dispatchEvent(new Event('dataUpdated'));
                            chatHistory.push({ role: 'assistant', content: reply });
                            chatHistory.push({ role: 'system', content: "AKTION ERFOLGREICH: Die Transaktion wurde gespeichert." });
                            reply = await getAIResponse(chatHistory);
                        } else break;
                    } catch (jsonErr) {
                        console.error("[Joule] Malformed ADD_TRANSACTION JSON:", aM[1], jsonErr);
                        break;
                    }
                }
                else break;
            }
            if (typingEl) typingEl.remove();
            appendMessage(reply, 'assistant', null, true);
        } catch (err) {
            console.error(err);
            if (typingEl) typingEl.remove();
            appendMessage(err.message || 'Fehler bei der Kommunikation.', 'assistant', null, true);
        } finally { sendBtn.disabled = false; }
    }
})();
