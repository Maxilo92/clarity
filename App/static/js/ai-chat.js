(function () {
    const API_PROXY = '/api/chat';

    // --- 1. GET USER AND STORAGE REFERENCES ---
    const userStr = localStorage.getItem('clarityUser');
    let userId = 'guest', companyId = null, userName = 'User';
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            userId = user.id || 'guest';
            companyId = user.company_id || null;
            userName = user.full_name || 'User';
        } catch (e) {
            console.error("Could not parse user from localStorage", e);
        }
    }
    const STORAGE_KEY = `clair_chat_history_${userId}`;
    let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return "Guten Morgen";
        if (hour < 18) return "Guten Tag";
        return "Guten Abend";
    }

    const SYSTEM_PROMPT = `You are Clair, an intelligent financial advisor for "Clarity". 
Address the user naturally. 

### CAPABILITIES:
- Transaction Analysis: Search and add transactions.
- Subscriptions: Detect recurring payments.
- Trends: Identify spending patterns.
- Forecast: Predict future spending.
- Management: Delete transactions by numerical ID (found in context).

### DIRECTIVES:
1. To SEARCH: add QUERY:{"category": "string", "date": "YYYY-MM-DD", "name": "search term"}
2. To ADD TRANSACTION: add ADD_TRANSACTION:{"name": "Item", "amount": -12.99, "category": "Groceries", "date": "ISO8601", "description": "Details"}
3. To DELETE: add DELETE_TRANSACTION:{"id": 123456789, "name": "Item Name"}
4. **ALWAYS SPEAK:** You MUST always provide a brief natural response (max 2 sentences) describing what you are doing or what you found. NEVER send ONLY technical markers.
5. **ID KNOWLEDGE:** You can find the numerical IDs in the Database Context (e.g. "ID 1741...: [Date] Name..."). Use these IDs for the DELETE tool.
6. **STRICT:** Only perform the requested action. NEVER add a transaction to "log" or "confirm" a deletion.
7. Markers at the VERY END.
8. Brevity: max 3 sentences.`;

    const ICONS = {
        paperclip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`,
        close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
        trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    };

    // --- 2. INJECT PANEL HTML ---
    if (!document.getElementById('aiChatPanel')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="ai-chat-overlay" id="aiChatOverlay"></div>
            <aside class="ai-chat-panel" id="aiChatPanel" aria-label="Clair">
                <div class="ai-chat-header">
                    <div class="ai-chat-header-content">
                        <div class="ai-chat-title" id="aiChatTitle">
                            <div class="ai-chat-icon-container">
                                <img src="../assets/icons/joule_logo.png" alt="Clair">
                                <div class="ai-chat-online-indicator"></div>
                            </div>
                            <div class="ai-chat-title-text">
                                <span class="ai-chat-name">Clair</span>
                                <span class="ai-chat-status">KI-Assistent</span>
                            </div>
                        </div>
                        <div class="ai-chat-controls">
                            <button id="aiChatClear" class="ai-chat-control-btn" title="Chat löschen">
                                ${ICONS.trash}
                            </button>
                            <button id="aiChatClose" class="ai-chat-control-btn ai-chat-close-btn" title="Schließen">
                                ${ICONS.close}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="ai-chat-messages" id="aiChatMessages"></div>
                <div class="ai-chat-footer">
                    <div id="aiChatAttachmentPreview" class="ai-chat-attachment-preview"></div>
                    <div class="ai-chat-input-area">
                        <div class="ai-chat-input-wrapper">
                            <textarea id="aiChatInput" placeholder="Frage Clair..." rows="1"></textarea>
                            <button id="aiChatSend" class="ai-chat-send-button" title="Senden">
                                ${ICONS.send}
                            </button>
                        </div>
                        <div class="ai-chat-disclaimer">Clair kann Fehler machen.</div>
                    </div>
                </div>
            </aside>
        `);
    }

    // --- 3. INJECT DELETION MODAL ---
    if (!document.getElementById('clairDeleteModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="clair-delete-modal" id="clairDeleteModal">
                <div class="clair-delete-overlay" id="clairDeleteOverlay"></div>
                <div class="clair-delete-content">
                    <div class="clair-delete-header">
                        <h3>Transaktionen löschen</h3>
                        <p>Wähle aus, welche Einträge entfernt werden sollen:</p>
                    </div>
                    <div class="clair-delete-list" id="clairDeleteList"></div>
                    <div class="clair-delete-footer">
                        <button class="clair-delete-btn clair-delete-btn-cancel" id="clairDeleteCancel">Abbrechen</button>
                        <button class="clair-delete-btn clair-delete-btn-confirm" id="clairDeleteConfirm">Löschen bestätigen</button>
                    </div>
                </div>
            </div>
        `);
    }

    // Capture references AFTER injection
    let panel, overlay, closeBtn, clearBtn, input, sendBtn, messages, attachmentPreview;
    let currentAttachment = null;

    function initRefs() {
        panel = document.getElementById('aiChatPanel');
        overlay = document.getElementById('aiChatOverlay');
        closeBtn = document.getElementById('aiChatClose');
        clearBtn = document.getElementById('aiChatClear');
        input = document.getElementById('aiChatInput');
        sendBtn = document.getElementById('aiChatSend');
        messages = document.getElementById('aiChatMessages');
        attachmentPreview = document.getElementById('aiChatAttachmentPreview');
    }

    function openChat(e) {
        if (e) e.preventDefault();
        console.log("[Clair] Opening side panel...");
        if (!panel) initRefs();
        panel.classList.add('open');
        overlay.classList.add('open');
        input.focus();
        
        // Remove notification dot when opening
        document.querySelectorAll('.diamond-btn').forEach(btn => btn.classList.remove('has-notification'));
    }

    function closeChat() {
        if (!panel) initRefs();
        panel.classList.remove('open');
        overlay.classList.remove('open');
    }

    function clearChat() {
        if (confirm("Möchtest du den gesamten Chat-Verlauf wirklich löschen?")) {
            chatHistory = [];
            localStorage.removeItem(STORAGE_KEY);
            initializeChat();
        }
    }

    function setAttachment(transaction) {
        if (!attachmentPreview) initRefs();
        currentAttachment = transaction;
        
        if (transaction) {
            attachmentPreview.innerHTML = `
                <div class="attachment-bubble small">
                    <span class="attachment-icon">${ICONS.paperclip}</span>
                    <div class="attachment-info">
                        <span class="attachment-name">${transaction.name}</span>
                        <span class="attachment-meta">${Math.abs(transaction.wert).toFixed(2)}€ • ${new Date(transaction.timestamp).toLocaleDateString()}</span>
                    </div>
                    <button class="attachment-remove" id="aiChatRemoveAttachment">${ICONS.close}</button>
                </div>
            `;
            attachmentPreview.classList.add('visible');
            document.getElementById('aiChatRemoveAttachment').onclick = () => setAttachment(null);
        } else {
            attachmentPreview.innerHTML = '';
            attachmentPreview.classList.remove('visible');
        }
    }

    /**
     * Shows a custom modal to confirm transaction deletions.
     * @param {Array} items - List of {id, name} objects to delete
     * @returns {Promise} - Resolves with list of IDs to delete, or empty array if cancelled
     */
    function showDeleteConfirmation(items) {
        return new Promise((resolve) => {
            const modal = document.getElementById('clairDeleteModal');
            const list = document.getElementById('clairDeleteList');
            const cancelBtn = document.getElementById('clairDeleteCancel');
            const confirmBtn = document.getElementById('clairDeleteConfirm');
            const overlay = document.getElementById('clairDeleteOverlay');

            if (!modal || !list) return resolve([]);

            list.innerHTML = items.map(item => `
                <label class="clair-delete-item">
                    <input type="checkbox" checked data-id="${item.id}">
                    <div class="clair-delete-item-info">
                        <span class="clair-delete-item-name">${item.name || 'Unbenannt'}</span>
                        <span class="clair-delete-item-meta">ID: ${item.id}</span>
                    </div>
                </label>
            `).join('');

            const close = (result) => {
                modal.classList.remove('open');
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                overlay.onclick = null;
                resolve(result);
            };

            cancelBtn.onclick = () => close([]);
            overlay.onclick = () => close([]);
            confirmBtn.onclick = () => {
                const checked = [...list.querySelectorAll('input:checked')].map(cb => cb.dataset.id);
                close(checked);
            };

            modal.classList.add('open');
        });
    }

    function appendMessage(text, role, save = true, attachment = null, isError = false, forceNoTypewriter = false, toolInfo = null, timestamp = null) {
        if (!text && !attachment) return;
        if (!messages) initRefs();

        // Filter out technical markers and function calls from display
        const cleanText = text.replace(/(QUERY|ADD_TRANSACTION|DELETE_TRANSACTION):[\s\n]*\{[\s\S]*?\}|<function=.*?>\s*(\{[\s\S]*?\})?/gi, '').trim();
        if (!cleanText && role !== 'user' && !attachment) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-message ai-message--' + (role === 'user' ? 'user' : 'bot');
        if (isError) wrapper.classList.add('error');
        
        const avatar = document.createElement('div');
        avatar.className = 'ai-message-avatar ' + (role === 'user' ? 'user-avatar' : 'bot-avatar-small');
        if (role === 'user') {
            avatar.textContent = userName ? userName.charAt(0).toUpperCase() : 'U';
        } else {
            const botImg = document.createElement('img');
            botImg.src = '../assets/icons/joule_logo.png';
            botImg.alt = 'Clair';
            avatar.appendChild(botImg);
        }

        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'ai-message-bubble-container';

        if (attachment) {
            const attBubble = document.createElement('div');
            attBubble.className = 'attachment-bubble small';
            attBubble.innerHTML = `
                <span class="attachment-icon">${ICONS.paperclip}</span>
                <div class="attachment-info">
                    <span class="attachment-name">${attachment.name}</span>
                    <span class="attachment-meta">${Math.abs(attachment.wert).toFixed(2)}€ • ${new Date(attachment.timestamp).toLocaleDateString()}</span>
                </div>
            `;
            bubbleContainer.appendChild(attBubble);
        }

        if (cleanText) {
            const bubble = document.createElement('div');
            bubble.className = 'ai-message-bubble';
            
            if (role !== 'user' && !forceNoTypewriter && !isError) {
                // Typewriter effect for bot
                let i = 0;
                const speed = 20; // ms
                bubble.innerHTML = '';
                
                function typeWriter() {
                    if (i < cleanText.length) {
                        bubble.textContent += cleanText.charAt(i);
                        i++;
                        messages.scrollTop = messages.scrollHeight;
                        setTimeout(typeWriter, speed);
                    } else {
                        if (typeof marked !== 'undefined') {
                            bubble.innerHTML = marked.parse(cleanText);
                        }
                        if (toolInfo) addToolTag(bubbleContainer, toolInfo);
                        messages.scrollTop = messages.scrollHeight;
                    }
                }
                setTimeout(typeWriter, speed);
            } else {
                if (role !== 'user' && typeof marked !== 'undefined') {
                    bubble.innerHTML = marked.parse(cleanText);
                } else {
                    bubble.textContent = cleanText;
                }
                if (toolInfo) addToolTag(bubbleContainer, toolInfo);
            }
            bubbleContainer.appendChild(bubble);
        }

        // Timestamp
        const displayDate = timestamp ? new Date(timestamp) : new Date();
        const timeStr = displayDate.getHours().toString().padStart(2, '0') + ':' + displayDate.getMinutes().toString().padStart(2, '0');
        const ts = document.createElement('div');
        ts.className = 'ai-message-timestamp';
        ts.textContent = timeStr;
        bubbleContainer.appendChild(ts);

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubbleContainer);
        messages.appendChild(wrapper);
        messages.scrollTop = messages.scrollHeight;

        if (save) {
            chatHistory.push({ role, content: text, attachment, timestamp: displayDate.toISOString(), toolInfo });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-20)));
        }
    }

    function addToolTag(container, info) {
        const tag = document.createElement('div');
        tag.className = 'ai-tool-tag';
        tag.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            <div class="ai-tool-tooltip">
                <strong>${info.type === 'add' ? 'Transaktion hinzugefügt' : (info.type === 'delete' ? 'Transaktion gelöscht' : 'Suche ausgeführt')}</strong>
                <div class="tool-details">
                    ${Object.entries(info.data).map(([k, v]) => `<div><span>${k}:</span> ${v}</div>`).join('')}
                </div>
            </div>
        `;
        container.appendChild(tag);
    }

    function showTyping() {
        if (!messages) initRefs();
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-message ai-message--bot ai-typing';
        
        const avatar = document.createElement('div');
        avatar.className = 'ai-message-avatar bot-avatar-small';
        const botImg = document.createElement('img');
        botImg.src = '../assets/icons/joule_logo.png';
        botImg.alt = 'Clair';
        avatar.appendChild(botImg);

        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble';
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'ai-typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dotsContainer.appendChild(dot);
        }
        bubble.appendChild(dotsContainer);
        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        messages.appendChild(wrapper);
        messages.scrollTop = messages.scrollHeight;
        return wrapper;
    }

    async function sendMessage() {
        if (!input) initRefs();
        const text = input.value.trim();
        if (!text && !currentAttachment) return;

        appendMessage(text, 'user', true, currentAttachment);
        input.value = '';
        input.style.height = 'auto';
        setAttachment(null);
        sendBtn.disabled = true;

        const typingEl = showTyping();
        let fullReply = "";
        let bubble = null;

        try {
            const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(
                chatHistory.map(m => {
                    let content = m.content;
                    if (m.attachment) {
                        content += `\n\n[ATTACHED TRANSACTION - BEREITS IN DATENBANK]\n`;
                        if (m.attachment.id) content += `- ID: ${m.attachment.id}\n`;
                        content += `- Name: ${m.attachment.name}\n`;
                        content += `- Betrag: ${m.attachment.wert}€\n`;
                        if (m.attachment.kategorie) content += `- Kategorie: ${m.attachment.kategorie}\n`;
                        if (m.attachment.timestamp) content += `- Datum: ${new Date(m.attachment.timestamp).toLocaleDateString()}\n`;
                        content += `[ENDE ATTACHMENT]`;
                    }
                    return { role: m.role === 'bot' ? 'assistant' : m.role, content };
                })
            );

            const response = await fetch(API_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages, company_id: companyId, user_id: userId, stream: true })
            });

            if (!response.ok) throw new Error("Server Error");

            typingEl.remove();
            
            // Create a placeholder bot message bubble for streaming
            const wrapper = document.createElement('div');
            wrapper.className = 'ai-message ai-message--bot';
            const avatar = document.createElement('div');
            avatar.className = 'ai-message-avatar bot-avatar-small';
            avatar.innerHTML = `<img src="../assets/icons/joule_logo.png" alt="Clair">`;
            const bubbleContainer = document.createElement('div');
            bubbleContainer.className = 'ai-message-bubble-container';
            bubble = document.createElement('div');
            bubble.className = 'ai-message-bubble';
            bubbleContainer.appendChild(bubble);
            wrapper.appendChild(avatar);
            wrapper.appendChild(bubbleContainer);
            messages.appendChild(wrapper);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.content) {
                                fullReply += data.content;
                                // Update bubble content (filtered)
                                let displayContent = fullReply.replace(/(QUERY|ADD_TRANSACTION|DELETE_TRANSACTION):[\s\n]*\{[\s\S]*?\}|<function=.*?>\s*(\{[\s\S]*?\})?/gi, '').trim();
                                
                                // Better placeholder while streaming
                                if (!displayContent) {
                                    if (fullReply.includes("DELETE_TRANSACTION")) displayContent = "Ich bereite die Löschung vor...";
                                    else if (fullReply.includes("ADD_TRANSACTION")) displayContent = "Ich füge die Transaktion hinzu...";
                                    else if (fullReply.includes("QUERY")) displayContent = "Ich suche nach den Daten...";
                                    else displayContent = "Claire denkt nach...";
                                }

                                if (typeof marked !== 'undefined') bubble.innerHTML = marked.parse(displayContent);
                                else bubble.textContent = displayContent;
                                messages.scrollTop = messages.scrollHeight;
                            }
                        } catch (e) {}
                    }
                }
            }

            // Final content check after stream ends
            let finalDisplay = fullReply.replace(/(QUERY|ADD_TRANSACTION|DELETE_TRANSACTION):[\s\n]*\{[\s\S]*?\}|<function=.*?>\s*(\{[\s\S]*?\})?/gi, '').trim();
            if (!finalDisplay) {
                if (fullReply.includes("DELETE_TRANSACTION")) finalDisplay = "Ich habe die Transaktionen für die Löschung vorbereitet.";
                else if (fullReply.includes("ADD_TRANSACTION")) finalDisplay = "Ich habe die Transaktion erfolgreich hinzugefügt.";
                else if (fullReply.includes("QUERY")) finalDisplay = "Ich habe die Dashboard-Ansicht für dich aktualisiert.";
                else finalDisplay = "Ich habe die gewünschte Aktion ausgeführt.";
                
                if (typeof marked !== 'undefined') bubble.innerHTML = marked.parse(finalDisplay);
                else bubble.textContent = finalDisplay;
            }

            // Post-processing after stream
            let toolInfo = null;

            // Deletions with custom confirmation UI
            const deleteMatches = [...fullReply.matchAll(/DELETE_TRANSACTION:\s*(\{[\s\S]*?\})/g)];
            if (deleteMatches.length > 0) {
                try {
                    const toDelete = deleteMatches.map(m => JSON.parse(m[1]));
                    const confirmedIds = await showDeleteConfirmation(toDelete);
                    
                    if (confirmedIds && confirmedIds.length > 0) {
                        for (const id of confirmedIds) {
                            await fetch(`/api/transactions/${id}?company_id=${companyId}`, { method: 'DELETE' });
                        }
                        
                        const names = toDelete.filter(i => confirmedIds.includes(i.id.toString())).map(i => i.name).join(', ');
                        toolInfo = { type: 'delete', data: { count: confirmedIds.length, items: names } };
                        document.dispatchEvent(new Event('dataUpdated'));
                        if (window.IndexManager) window.IndexManager.forceRebuild(); // ensure local index is fresh
                    }
                } catch(e) { console.error("[Clair] Delete processing error:", e); }
            }

            // Additions
            if (!toolInfo) {
                const addMatch = fullReply.match(/ADD_TRANSACTION:\s*(\{[\s\S]*?\})/);
                if (addMatch) {
                    try { 
                        toolInfo = { type: 'add', data: JSON.parse(addMatch[1]) }; 
                        document.dispatchEvent(new Event('dataUpdated'));
                    } catch(e) {}
                }
            }

            // Search
            if (!toolInfo) {
                const queryMatch = fullReply.match(/(QUERY|FILTER_DASHBOARD):\s*(\{[\s\S]*?\})/);
                if (queryMatch) {
                    try {
                        const query = JSON.parse(queryMatch[2]);
                        toolInfo = { type: 'query', data: query };
                        document.dispatchEvent(new CustomEvent('forceFilter', { detail: query }));
                    } catch(e) {}
                }
            }

            if (toolInfo) addToolTag(bubbleContainer, toolInfo);

            // Add timestamp
            const now = new Date();
            const ts = document.createElement('div');
            ts.className = 'ai-message-timestamp';
            ts.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            bubbleContainer.appendChild(ts);

            chatHistory.push({ role: 'bot', content: fullReply, toolInfo, timestamp: now.toISOString() });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-20)));

            if (!panel || !panel.classList.contains('open')) {
                document.querySelectorAll('.diamond-btn').forEach(btn => btn.classList.add('has-notification'));
            }
        } catch (error) {
            if (typingEl) typingEl.remove();
            appendMessage('Fehler: ' + error.message, 'bot', false, null, true);
        } finally {
            sendBtn.disabled = false;
        }
    }

    function setupEventListeners() {
        initRefs();
        if (closeBtn) closeBtn.onclick = closeChat;
        if (overlay) overlay.onclick = closeChat;
        if (clearBtn) clearBtn.onclick = clearChat;
        if (sendBtn) sendBtn.onclick = sendMessage;
        if (input) {
            input.oninput = function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; };
            input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
        }
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChat(); });

        const diamondBtns = document.querySelectorAll('.diamond-btn');
        if (diamondBtns.length > 0) {
            console.log(`[Clair] Found ${diamondBtns.length} diamond button(s).`);
            diamondBtns.forEach(btn => {
                // Remove old listeners to avoid multiple attachments if script runs twice
                btn.onclick = null; 
                btn.addEventListener('click', openChat);
            });
        } else {
            console.log("[Clair] No diamond button found yet, retrying in 500ms...");
            setTimeout(setupEventListeners, 500);
        }
    }

    function initializeChat() {
        if (!messages) initRefs();
        messages.innerHTML = '';
        if (chatHistory.length === 0) {
            const greeting = getTimeBasedGreeting();
            appendMessage(`${greeting}! Ich bin Clair. Wie kann ich dir heute helfen?`, 'bot', true);
        } else {
            chatHistory.forEach(msg => appendMessage(msg.content, msg.role, false, msg.attachment, false, true, msg.toolInfo, msg.timestamp));
        }
    }

    setupEventListeners();
    initializeChat();

    document.addEventListener('attachToClair', (e) => {
        const t = e.detail.transaction;
        if (!t) return;
        openChat();
        setAttachment(t);
        input.value = `Kannst du mir mehr zu dieser Transaktion sagen?`;
        input.focus();
    });
})();
