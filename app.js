// JavaScript部分与上一版完全相同，无需改动
document.addEventListener('DOMContentLoaded', () => {
    const safeSetItem = (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Storage quota exceeded or error saving to localStorage:', e);
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('LocalStorage capacity reached. To prevent crashes, this action was not saved. Please clear some storage.');
            }
        }
    };

    const compressImage = (file, maxWidth, maxHeight, quality, callback) => {
        if (!file || !file.type.startsWith('image/')) return callback(null);
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const homePage = document.getElementById('home-screen-page');
    const beautifyPage = document.getElementById('beautify-page');
    const beautifyBtn = document.getElementById('nav-item-1');
    const backBtn = document.getElementById('back-to-home-btn');
    const phoneScreen = document.getElementById('phone-screen');
    
    // 聊天软件相关元素
    const chatAppBtn = document.getElementById('app-item-1');
    const chatAppPage = document.getElementById('chat-app-page');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatNavItems = document.querySelectorAll('.chat-nav-item');
    const chatViewPanels = document.querySelectorAll('.chat-view-panel');
    const chatHeaderTitle = document.getElementById('chat-header-title');
    
    // 新增按钮和页面
    const addFriendBtn = document.getElementById('add-friend-btn');
    const addContactBtn = document.getElementById('add-contact-btn');
    const addContactPage = document.getElementById('add-contact-page');
    const closeAddContactBtn = document.getElementById('close-add-contact-btn');
    const saveContactBtn = document.getElementById('save-contact-btn');
    const contactAvatarUpload = document.getElementById('upload-contact-avatar');
    const contactAvatarPreview = document.getElementById('contact-avatar-preview');
    
    const selectContactModal = document.getElementById('select-contact-modal');
    const closeSelectContactBtn = document.getElementById('close-select-contact-btn');
    
    // 数据存储
    let contacts = JSON.parse(localStorage.getItem('chat_contacts') || '[]');
    let chatList = JSON.parse(localStorage.getItem('chat_list') || '[]');
    let messagesData = JSON.parse(localStorage.getItem('chat_messages') || '{}'); // { contactId: [ {sender:'me'|'them', text:'', time:123} ] }
    let stickerGroups = JSON.parse(localStorage.getItem('chat_sticker_groups') || '[]'); // [ {id, name, stickers: [{name, url}]} ]
    let roleProfiles = JSON.parse(localStorage.getItem('chat_role_profiles') || '{}'); // { contactId: { wbId, stickerGroupId, autoMem, memory, userPersona } }
    
    let currentContactAvatarBase64 = '';
    let currentActiveContactId = null;
    let currentStickerGroupId = null; // 用于表情包管理页面
    let editingContactId = null; // 记录正在编辑的联系人

    const chatConversationPage = document.getElementById('chat-conversation-page');
    const convBackBtn = document.getElementById('conv-back-btn');
    const convMessagesContainer = document.getElementById('conv-messages-container');
    const convHeaderName = document.getElementById('conv-header-name');
    const convHeaderAvatar = document.getElementById('conv-header-avatar');
    const convMsgInput = document.getElementById('conv-msg-input');
    const convProfileBtn = document.getElementById('conv-profile-btn');
    const innerVoiceBubble = document.getElementById('inner-voice-bubble');
    const chatPlusBtn = document.getElementById('chat-plus-btn');
    const chatSmileBtn = document.getElementById('chat-smile-btn');
    const chatAiBtn = document.getElementById('chat-ai-btn');
    const chatDrawerPlus = document.getElementById('chat-drawer-plus');
    const chatDrawerSmile = document.getElementById('chat-drawer-smile');
    
    // --- 消息交互相关变量 ---
    let selectedMsgIndex = null;
    let isMultiSelectMode = false;
    let selectedMsgIndices = new Set();
    window.currentQuoteText = ''; // 用window挂载方便sendMsg访问
    const msgContextMenu = document.getElementById('msg-context-menu');
    const menuItemQuote = document.getElementById('menu-item-quote');
    const menuItemRecall = document.getElementById('menu-item-recall');
    const menuItemDelete = document.getElementById('menu-item-delete');
    const menuItemMultiselect = document.getElementById('menu-item-multiselect');
    const quotePreviewArea = document.getElementById('quote-preview-area');
    const quotePreviewText = document.getElementById('quote-preview-text');
    const quotePreviewClose = document.getElementById('quote-preview-close');
    const multiSelectBar = document.getElementById('multi-select-bar');
    const multiSelectCancel = document.getElementById('multi-select-cancel');
    const multiSelectDeleteBtn = document.getElementById('multi-select-delete-btn');
    const convBottomContainer = document.getElementById('conv-bottom-container');

    // 双击气泡
    convMessagesContainer.addEventListener('dblclick', (e) => {
        const bubble = e.target.closest('.msg-bubble');
        if (!bubble) return;
        
        selectedMsgIndex = parseInt(bubble.dataset.index);
        const rect = bubble.getBoundingClientRect();
        
        msgContextMenu.style.display = 'flex';
        let top = rect.top - msgContextMenu.offsetHeight - 10;
        let left = rect.left + (rect.width / 2) - (msgContextMenu.offsetWidth / 2);
        
        if (top < 50) top = rect.bottom + 10; // 如果上方空间不足，显示在下方
        if (left < 10) left = 10;
        if (left + msgContextMenu.offsetWidth > window.innerWidth - 10) {
            left = window.innerWidth - msgContextMenu.offsetWidth - 10;
        }
        
        msgContextMenu.style.top = `${top}px`;
        msgContextMenu.style.left = `${left}px`;
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.msg-context-menu') && !e.target.closest('.msg-bubble')) {
            msgContextMenu.style.display = 'none';
        }
    });

    menuItemDelete.addEventListener('click', () => {
        if (selectedMsgIndex === null || !currentActiveContactId) return;
        messagesData[currentActiveContactId].splice(selectedMsgIndex, 1);
        localStorage.setItem('chat_messages', JSON.stringify(messagesData));
        renderMessages();
        msgContextMenu.style.display = 'none';
    });

    menuItemMultiselect.addEventListener('click', () => {
        isMultiSelectMode = true;
        selectedMsgIndices.clear();
        msgContextMenu.style.display = 'none';
        convMessagesContainer.classList.add('multi-select-mode');
        renderMessages();
    });

    multiSelectCancel.addEventListener('click', () => {
        isMultiSelectMode = false;
        selectedMsgIndices.clear();
        convMessagesContainer.classList.remove('multi-select-mode');
        renderMessages();
    });

    multiSelectDeleteBtn.addEventListener('click', () => {
        if (selectedMsgIndices.size === 0) return;
        if (!confirm(`确定要删除选中的 ${selectedMsgIndices.size} 条消息吗？`)) return;
        
        let indicesArray = Array.from(selectedMsgIndices).sort((a,b) => b - a);
        indicesArray.forEach(idx => {
            messagesData[currentActiveContactId].splice(idx, 1);
        });
        localStorage.setItem('chat_messages', JSON.stringify(messagesData));
        
        isMultiSelectMode = false;
        selectedMsgIndices.clear();
        convMessagesContainer.classList.remove('multi-select-mode');
        renderMessages();
    });

    menuItemRecall.addEventListener('click', () => {
        if (selectedMsgIndex === null || !currentActiveContactId) return;
        messagesData[currentActiveContactId][selectedMsgIndex].recalled = true;
        localStorage.setItem('chat_messages', JSON.stringify(messagesData));
        renderMessages();
        msgContextMenu.style.display = 'none';
    });

    menuItemQuote.addEventListener('click', () => {
        if (selectedMsgIndex === null || !currentActiveContactId) return;
        const msg = messagesData[currentActiveContactId][selectedMsgIndex];
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = msg.text;
        let textOnly = tempDiv.textContent || tempDiv.innerText || '[图片/表情包]';
        
        window.currentQuoteText = textOnly;
        quotePreviewText.innerText = `引用: ${window.currentQuoteText}`;
        quotePreviewArea.style.display = 'block';
        msgContextMenu.style.display = 'none';
        convMsgInput.focus();
    });

    quotePreviewClose.addEventListener('click', () => {
        window.currentQuoteText = '';
        quotePreviewArea.style.display = 'none';
    });
    // ----------------------
    
    const roleProfilePage = document.getElementById('role-profile-page');
    const closeRpBtn = document.getElementById('close-rp-btn');
    const saveRpBtn = document.getElementById('save-rp-btn');
    const rpAvatarPreview = document.getElementById('rp-avatar-preview');
    const rpNameDisplay = document.getElementById('rp-name-display');
    const rpDescDisplay = document.getElementById('rp-desc-display');
    const rpWorldbookSelect = document.getElementById('rp-worldbook-select');
    const rpStickerGroupSelect = document.getElementById('rp-sticker-group-select');
    const rpAutoMemory = document.getElementById('rp-auto-memory');
    const rpMemoryContent = document.getElementById('rp-memory-content');
    const rpUserPersona = document.getElementById('rp-user-persona');
    
    const stickerMgrPage = document.getElementById('sticker-mgr-page');
    const closeStickerMgrBtn = document.getElementById('close-sticker-mgr-btn');
    const createStickerGroupBtn = document.getElementById('create-sticker-group-btn');
    const importStickerTxtBtn = document.getElementById('import-sticker-txt-btn');
    const stickerMgrTabs = document.getElementById('sticker-mgr-tabs');
    const stickerMgrGrid = document.getElementById('sticker-mgr-grid');
    const stickerMgrEmpty = document.getElementById('sticker-mgr-empty');
    const addStickersBtn = document.getElementById('add-stickers-btn');
    const drawerBtnStickers = document.getElementById('drawer-btn-stickers');
    const stickerDrawerTabs = document.getElementById('sticker-drawer-tabs');
    const stickerDrawerGrid = document.getElementById('sticker-drawer-grid');

    // UI交互逻辑 (底部抽屉)
    const hideAllDrawers = () => {
        chatDrawerPlus.classList.remove('active');
        chatDrawerSmile.classList.remove('active');
        chatPlusBtn.classList.remove('active');
        chatSmileBtn.classList.remove('active');
    };
    
    chatPlusBtn.addEventListener('click', () => {
        if(chatDrawerPlus.classList.contains('active')) {
            hideAllDrawers();
        } else {
            hideAllDrawers();
            chatDrawerPlus.classList.add('active');
            chatPlusBtn.classList.add('active');
            convMessagesContainer.scrollTop = convMessagesContainer.scrollHeight;
        }
    });

    chatSmileBtn.addEventListener('click', () => {
        if(chatDrawerSmile.classList.contains('active')) {
            hideAllDrawers();
        } else {
            hideAllDrawers();
            chatDrawerSmile.classList.add('active');
            chatSmileBtn.classList.add('active');
            renderChatStickerDrawer();
            convMessagesContainer.scrollTop = convMessagesContainer.scrollHeight;
        }
    });

    // 相册上传逻辑
    const uploadChatImage = document.getElementById('upload-chat-image');
    if (uploadChatImage) {
        uploadChatImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            compressImage(file, 800, 800, 0.8, (dataUrl) => {
                if (!dataUrl) return;
                sendMsg('me', `<img src="${dataUrl}" class="chat-sent-image" style="max-width:200px; border-radius:12px;">`);
                hideAllDrawers();
                e.target.value = '';
            });
        });
    }

    // 悬浮窗交互逻辑
    const transferModal = document.getElementById('transfer-modal');
    const closeTransferBtn = document.getElementById('close-transfer-btn');
    const tpSubmitBtn = document.getElementById('tp-submit-btn');
    const tpAmountInput = document.getElementById('tp-amount-input');
    const tpNoteInput = document.getElementById('tp-note-input');
    const drawerBtnTransfer = document.getElementById('drawer-btn-transfer');

    if (drawerBtnTransfer) {
        drawerBtnTransfer.addEventListener('click', () => {
            hideAllDrawers();
            if(tpAmountInput) tpAmountInput.value = '';
            if(tpNoteInput) tpNoteInput.value = '';
            if(transferModal) transferModal.style.display = 'flex';
            setTimeout(() => { if(tpAmountInput) tpAmountInput.focus() }, 50);
        });
    }

    const closeTransferPopup = () => { if(transferModal) transferModal.style.display = 'none'; };
    if(closeTransferBtn) closeTransferBtn.addEventListener('click', closeTransferPopup);

    if(tpSubmitBtn) {
        tpSubmitBtn.addEventListener('click', () => {
            const amount = tpAmountInput.value.trim();
            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                alert('请输入有效的金额');
                return;
            }
            const note = tpNoteInput ? tpNoteInput.value.trim() : '';
            const msgText = note ? `[转账:${amount}:${note}]` : `[转账:${amount}]`;
            sendMsg('me', msgText);
            closeTransferPopup();
        });
    }

    const textImgModal = document.getElementById('textimg-modal');
    const closeTextImgBtn = document.getElementById('close-textimg-btn');
    const tiSubmitBtn = document.getElementById('ti-submit-btn');
    const tiContentInput = document.getElementById('ti-content-input');
    const drawerBtnTextimg = document.getElementById('drawer-btn-textimg');

    if (drawerBtnTextimg) {
        drawerBtnTextimg.addEventListener('click', () => {
            hideAllDrawers();
            if(tiContentInput) tiContentInput.value = '';
            if(textImgModal) textImgModal.style.display = 'flex';
            setTimeout(() => { if(tiContentInput) tiContentInput.focus() }, 50);
        });
    }

    const closeTextImgPopup = () => { if(textImgModal) textImgModal.style.display = 'none'; };
    if(closeTextImgBtn) closeTextImgBtn.addEventListener('click', closeTextImgPopup);

    document.querySelectorAll('.ui-modal-bg').forEach(bg => bg.addEventListener('click', () => {
        if(transferModal) transferModal.style.display = 'none';
        if(textImgModal) textImgModal.style.display = 'none';
    }));

    if(tiSubmitBtn) {
        tiSubmitBtn.addEventListener('click', () => {
            const content = tiContentInput ? tiContentInput.value.trim() : '';
            if (!content) {
                alert('请输入文字内容');
                return;
            }
            sendMsg('me', `[文字图:${content}]`);
            closeTextImgPopup();
        });
    }

    chatAiBtn.addEventListener('click', async () => {
        if (!currentActiveContactId) return;
        
        const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        if (!apiData.url || !apiData.key || !apiData.modelName) {
            alert('请先在设置中配置API地址、秘钥和模型名称。');
            return;
        }

        const contact = contacts.find(c => c.id === currentActiveContactId);
        const profile = roleProfiles[currentActiveContactId] || {};
        const msgs = messagesData[currentActiveContactId] || [];
        
        const originalIcon = chatAiBtn.innerHTML;
        chatAiBtn.innerHTML = `<i class='bx bx-loader-alt spin'></i>`;
        chatAiBtn.disabled = true;
        const statusEl = document.getElementById('conv-header-status');
        if (statusEl) statusEl.innerText = '正在输入中...';

        let systemPrompt = `你扮演角色：${contact.name}。
基本设定：性别 ${contact.gender || '未知'}，年龄 ${contact.age || '未知'}。
详细人设：${contact.desc || '暂无'}
请遵循线上聊天规则，要有活人感，采用短讯式回复，不要长篇大论。
【重要指令】你必须严格使用给定的人设、世界书和用户人设来回答问题。在每次回复内容的开头，你必须根据当前的人设、世界书和聊天内容，输出你当前的心情、动作或状态。必须严格使用 [状态:你的状态] 的格式，例如：[状态:去抓某个又偷吃的小猫(=^･ω･^=)]。

【输出格式要求（非常重要）】
你必须返回一个JSON数组，数组中的每个元素代表你发送的一条独立气泡消息。你每次输出的条数不能少于4条！
格式如下：
[
  "[状态:你的状态(带颜文字)]",
  "第一条消息内容",
  "第二条消息内容",
  "第三条消息内容",
  "第四条消息内容"
]
注意：数组的第一个元素必须是状态标签！从第二个元素开始是发送的消息。
如果你想发语音，可以使用格式 [语音:内容:时长秒数]（如：[语音:你好呀:3]）。
如果你想主动转账给用户，可以使用格式 [转账:金额]（如：[转账:520]）。
如果你想发送图片给用户（根据聊天内容判断是否需要发图），请发送格式为 [发送图片:具体的英文画面描述] 的消息（如：[发送图片:1girl, looking at viewer, smile, selfie]）。
`;
        if (profile.userPersona) systemPrompt += `\n【用户人设】\n${profile.userPersona}\n`;
        if (profile.memory) systemPrompt += `\n【总结记忆】\n${profile.memory}\n`;

        if (profile.wbId) {
            const allWbs = worldBooks.global.concat(worldBooks.local);
            const boundWb = allWbs.find(x => x.id === profile.wbId);
            if (boundWb) {
                systemPrompt += `\n【世界书设定】\n`;
                if (boundWb.type === 'item') {
                    systemPrompt += `${boundWb.title}: ${boundWb.content}\n`;
                } else if (boundWb.type === 'folder') {
                    const items = allWbs.filter(x => x.parentId === boundWb.id && x.type === 'item');
                    items.forEach(item => {
                        systemPrompt += `${item.title}: ${item.content}\n`;
                    });
                }
            }
        }

        let boundStickers = [];
        if (profile.stickerGroupId) {
            const group = stickerGroups.find(g => g.id === profile.stickerGroupId);
            if (group && group.stickers.length > 0) {
                boundStickers = group.stickers;
                systemPrompt += `\n【你可以使用以下表情包】\n在回复中，你可以随时输出 [表情包:名称] 来发送表情。可用表情名称列表：${boundStickers.map(s => s.name).join(', ')}。\n`;
            }
        }

        let apiMessages = [{ role: 'system', content: systemPrompt }];
        
        msgs.forEach(msg => {
            let role = msg.sender === 'me' ? 'user' : 'assistant';
            
            if (msg.recalled) {
                apiMessages.push({ role: role, content: `[系统提示: ${role === 'user' ? '用户' : '你'}撤回了一条消息]` });
                return;
            }

            let tMatch = msg.text.match(/^\[文字图:([\s\S]*?)\]$/);
            if (tMatch) {
                let content = tMatch[1];
                let prompt = `[系统提示: ${role === 'user' ? '用户给你' : '你给用户'}发送了一张长图截屏，由于当前无法直接视觉解析图片，图片上的文字内容提取如下：\n"${content}"\n请你在回复时，把这当做是一张真实的图片。]`;
                apiMessages.push({ role: role, content: prompt });
                return;
            }

            let sendImgMatch = msg.text.match(/^\[发送图片:(.*?)\]$/);
            if (sendImgMatch) {
                apiMessages.push({ role: role, content: `[系统提示: ${role === 'user' ? '用户给你' : '你给用户'}发送了一张图片，画面描述为: ${sendImgMatch[1]}]` });
                return;
            }
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = msg.text;
            
            let contentArray = [];
            if (msg.quote) {
                contentArray.push({ type: "text", text: `> 引用: ${msg.quote}\n` });
            }

            let hasRealImage = false;
            const imgs = tempDiv.querySelectorAll('img');
            
            imgs.forEach(img => {
                const alt = img.getAttribute('alt');
                if (alt && alt.startsWith('[表情包:')) {
                    img.replaceWith(document.createTextNode(alt));
                } else if (img.classList.contains('chat-sent-image') || img.src.startsWith('data:image') || img.src.startsWith('http')) {
                    hasRealImage = true;
                }
            });

            if (hasRealImage) {
                let textContent = tempDiv.textContent || tempDiv.innerText;
                if (textContent.trim()) {
                    contentArray.push({ type: "text", text: textContent.trim() });
                }
                
                const originalImgs = document.createElement('div');
                originalImgs.innerHTML = msg.text;
                originalImgs.querySelectorAll('img').forEach(img => {
                    const alt = img.getAttribute('alt');
                    if (!alt || !alt.startsWith('[表情包:')) {
                        contentArray.push({
                            type: "image_url",
                            image_url: { url: img.src }
                        });
                    }
                });
                apiMessages.push({ role: role, content: contentArray });
            } else {
                let textContent = tempDiv.textContent || tempDiv.innerText;
                if (msg.quote) textContent = `> 引用: ${msg.quote}\n` + textContent;
                apiMessages.push({ role: role, content: textContent });
            }
        });

        try {
            let url = apiData.url;
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/chat/completions')) url += '/chat/completions';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiData.key}`
                },
                body: JSON.stringify({
                    model: apiData.modelName,
                    messages: apiMessages
                })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const result = await response.json();
            let aiReplyRaw = result.choices[0].message.content;
            
            let messagesArray = [];
            try {
                const jsonMatch = aiReplyRaw.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    messagesArray = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON array found');
                }
            } catch (e) {
                messagesArray = aiReplyRaw.split('\n').filter(m => m.trim().length > 0);
            }

            if (messagesArray.length > 0 && messagesArray[0].startsWith('[状态:')) {
                let statusMatch = messagesArray[0].match(/\[状态:(.*?)\]/);
                if (statusMatch) {
                    const newState = statusMatch[1];
                    if (statusEl) statusEl.innerText = newState;
                    
                    let prof = roleProfiles[currentActiveContactId] || {};
                    prof.lastState = newState;
                    roleProfiles[currentActiveContactId] = prof;
                    safeSetItem('chat_role_profiles', JSON.stringify(roleProfiles));
                }
                messagesArray.shift();
            } else {
                if (statusEl) statusEl.innerText = '在线';
            }

            const sendNextMessage = (index) => {
                if (index >= messagesArray.length) {
                    chatAiBtn.innerHTML = originalIcon;
                    chatAiBtn.disabled = false;
                    return;
                }

                let msgText = messagesArray[index];
                
                if (boundStickers.length > 0) {
                    msgText = msgText.replace(/\[表情包:(.*?)\]/g, (match, name) => {
                        const sticker = boundStickers.find(s => s.name === name);
                        if (sticker) {
                            return `<img src="${sticker.url}" alt="[表情包:${sticker.name}]" style="max-width:120px; border-radius:8px;">`;
                        }
                        return match;
                    });
                }
                
                let sendImgMatch = msgText.match(/^\[发送图片:(.*?)\]$/);
                if (sendImgMatch) {
                    if (window.handleAIGenerateImage) {
                        window.handleAIGenerateImage(sendImgMatch[1], (imgMsg) => {
                            sendMsg('them', imgMsg);
                        });
                    } else {
                        sendMsg('them', msgText);
                    }
                } else {
                    sendMsg('them', msgText);
                }

                if (index < messagesArray.length - 1) {
                    if (statusEl) statusEl.innerText = '正在输入中...';
                    setTimeout(() => {
                        const currentProf = roleProfiles[currentActiveContactId] || {};
                        if (statusEl) statusEl.innerText = currentProf.lastState || '在线';
                        setTimeout(() => sendNextMessage(index + 1), 500);
                    }, 1000 + Math.random() * 1000);
                } else {
                    const currentProf = roleProfiles[currentActiveContactId] || {};
                    if (statusEl) statusEl.innerText = currentProf.lastState || '在线';
                    chatAiBtn.innerHTML = originalIcon;
                    chatAiBtn.disabled = false;
                }
            };

            if (messagesArray.length > 0) {
                sendNextMessage(0);
            } else {
                chatAiBtn.innerHTML = originalIcon;
                chatAiBtn.disabled = false;
            }

        } catch (error) {
            console.error('API Call Error:', error);
            alert('AI 回复失败: ' + error.message);
            if (statusEl) statusEl.innerText = '在线';
        } finally {
            chatAiBtn.innerHTML = originalIcon;
            chatAiBtn.disabled = false;
        }
    });

    convMsgInput.addEventListener('focus', hideAllDrawers);

    // 头像点击心声
    convHeaderAvatar.addEventListener('click', () => {
        innerVoiceBubble.style.display = 'block';
        setTimeout(() => { innerVoiceBubble.style.display = 'none'; }, 2500);
    });

    // 角色详情页逻辑
    convProfileBtn.addEventListener('click', () => {
        if(!currentActiveContactId) return;
        const contact = contacts.find(c => c.id === currentActiveContactId);
        if(!contact) return;
        
        rpAvatarPreview.style.backgroundImage = `url('${contact.avatar || ''}')`;
        rpNameDisplay.innerText = contact.name;
        rpDescDisplay.innerText = `${contact.gender || '未知'} | ${contact.age || '未知'}`;
        document.getElementById('rp-contact-desc').value = contact.desc || '';
        
        // 渲染表情包分组选项
        rpStickerGroupSelect.innerHTML = '<option value="">不绑定</option>';
        stickerGroups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.innerText = g.name;
            rpStickerGroupSelect.appendChild(opt);
        });
        
        if (typeof renderWbSelectOptions === 'function') {
            renderWbSelectOptions();
        }

        const profile = roleProfiles[currentActiveContactId] || {};
        rpWorldbookSelect.value = profile.wbId || '';
        rpStickerGroupSelect.value = profile.stickerGroupId || '';
        rpAutoMemory.checked = profile.autoMem || false;
        rpMemoryContent.value = profile.memory || '';
        rpUserPersona.value = profile.userPersona || '';
        document.getElementById('rp-custom-css').value = profile.customCss || '';
        if (profile.userAvatar) {
            document.getElementById('rp-user-avatar-preview').style.backgroundImage = `url('${profile.userAvatar}')`;
            document.getElementById('rp-user-avatar-preview').innerHTML = '';
        } else {
            document.getElementById('rp-user-avatar-preview').style.backgroundImage = 'none';
            document.getElementById('rp-user-avatar-preview').innerHTML = `<i class='bx bx-camera' style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999;"></i>`;
        }
        
        roleProfilePage.style.display = 'flex';
    });
    
    // 修改名字备注
    rpNameDisplay.addEventListener('blur', () => {
        if(!currentActiveContactId) return;
        const newName = rpNameDisplay.innerText.trim();
        if(newName) {
            const contactIndex = contacts.findIndex(c => c.id === currentActiveContactId);
            if(contactIndex !== -1) {
                contacts[contactIndex].name = newName;
                localStorage.setItem('chat_contacts', JSON.stringify(contacts));
                convHeaderName.innerText = newName;
                renderContacts();
                renderChatList();
            }
        }
    });
    
    // 用户头像上传
    let tempUserAvatarBase64 = null;
    document.getElementById('upload-user-avatar').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            tempUserAvatarBase64 = event.target.result;
            document.getElementById('rp-user-avatar-preview').style.backgroundImage = `url('${tempUserAvatarBase64}')`;
            document.getElementById('rp-user-avatar-preview').innerHTML = '';
            
            // 自动保存头像
            if(currentActiveContactId) {
                let profile = roleProfiles[currentActiveContactId] || {};
                profile.userAvatar = tempUserAvatarBase64;
                roleProfiles[currentActiveContactId] = profile;
                localStorage.setItem('chat_role_profiles', JSON.stringify(roleProfiles));
                renderMessages();
            }
        };
        reader.readAsDataURL(file);
    });
    
    // 自定义聊天背景
    document.getElementById('upload-chat-bg').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const bgUrl = event.target.result;
            if(currentActiveContactId) {
                let profile = roleProfiles[currentActiveContactId] || {};
                profile.chatBg = bgUrl;
                roleProfiles[currentActiveContactId] = profile;
                localStorage.setItem('chat_role_profiles', JSON.stringify(roleProfiles));
                applyChatBackground(bgUrl);
            }
        };
        reader.readAsDataURL(file);
    });
    
    document.getElementById('clear-chat-bg-btn').addEventListener('click', () => {
        if(currentActiveContactId) {
            let profile = roleProfiles[currentActiveContactId] || {};
            profile.chatBg = '';
            roleProfiles[currentActiveContactId] = profile;
            localStorage.setItem('chat_role_profiles', JSON.stringify(roleProfiles));
            applyChatBackground('');
        }
    });
    
    function applyChatBackground(bgUrl) {
        if(bgUrl) {
            chatConversationPage.style.backgroundImage = `url('${bgUrl}')`;
            chatConversationPage.style.backgroundSize = 'cover';
            chatConversationPage.style.backgroundPosition = 'center';
            chatConversationPage.classList.add('has-custom-bg');
            document.documentElement.style.setProperty('--chat-bg-color', 'transparent');
        } else {
            chatConversationPage.style.backgroundImage = 'none';
            chatConversationPage.style.backgroundColor = '#f8f9fa';
            chatConversationPage.classList.remove('has-custom-bg');
        }
    }
    
    function applyCustomCss(cssText) {
        let styleTag = document.getElementById('chat-custom-css');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'chat-custom-css';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = cssText || '';
    }
    
    closeRpBtn.addEventListener('click', () => { roleProfilePage.style.display = 'none'; });
    
    saveRpBtn.addEventListener('click', () => {
        if(!currentActiveContactId) return;

        const contactIndex = contacts.findIndex(c => c.id === currentActiveContactId);
        if (contactIndex !== -1) {
            contacts[contactIndex].desc = document.getElementById('rp-contact-desc').value.trim();
            localStorage.setItem('chat_contacts', JSON.stringify(contacts));
        }

        let profile = roleProfiles[currentActiveContactId] || {};
        profile.wbId = rpWorldbookSelect.value;
        profile.stickerGroupId = rpStickerGroupSelect.value;
        profile.autoMem = rpAutoMemory.checked;
        profile.memory = rpMemoryContent.value.trim();
        profile.userPersona = rpUserPersona.value.trim();
        profile.customCss = document.getElementById('rp-custom-css').value;
        
        roleProfiles[currentActiveContactId] = profile;
        safeSetItem('chat_role_profiles', JSON.stringify(roleProfiles));
        
        applyCustomCss(profile.customCss);
        roleProfilePage.style.display = 'none';
    });

    // 表情包管理页面逻辑
    drawerBtnStickers.addEventListener('click', () => {
        hideAllDrawers();
        renderStickerMgrTabs();
        stickerMgrPage.style.display = 'flex';
    });

    closeStickerMgrBtn.addEventListener('click', () => {
        stickerMgrPage.style.display = 'none';
    });

    createStickerGroupBtn.addEventListener('click', () => {
        const name = prompt('请输入表情包分组名称:');
        if(name && name.trim()) {
            const newGroup = { id: 'sg_' + Date.now(), name: name.trim(), stickers: [] };
            stickerGroups.push(newGroup);
            safeSetItem('chat_sticker_groups', JSON.stringify(stickerGroups));
            currentStickerGroupId = newGroup.id;
            renderStickerMgrTabs();
        }
    });

    importStickerTxtBtn.addEventListener('click', () => {
        alert('请点击分组内的“批量粘贴”按钮导入文本。');
    });

    function renderStickerMgrTabs() {
        stickerMgrTabs.innerHTML = '';
        if(stickerGroups.length === 0) {
            stickerMgrGrid.innerHTML = '';
            stickerMgrEmpty.style.display = 'flex';
            addStickersBtn.style.display = 'none';
            return;
        }
        
        if(!currentStickerGroupId && stickerGroups.length > 0) {
            currentStickerGroupId = stickerGroups[0].id;
        }

        stickerGroups.forEach(group => {
            const tab = document.createElement('div');
            tab.className = `sticker-tab ${group.id === currentStickerGroupId ? 'active' : ''}`;
            tab.innerText = group.name;
            tab.addEventListener('click', () => {
                currentStickerGroupId = group.id;
                renderStickerMgrTabs();
            });
            stickerMgrTabs.appendChild(tab);
        });
        
        renderStickerMgrGrid();
    }

    function renderStickerMgrGrid() {
        stickerMgrGrid.innerHTML = '';
        const group = stickerGroups.find(g => g.id === currentStickerGroupId);
        
        if(!group) return;
        
        addStickersBtn.style.display = 'block';
        
        if(group.stickers.length === 0) {
            stickerMgrEmpty.style.display = 'flex';
        } else {
            stickerMgrEmpty.style.display = 'none';
            group.stickers.forEach(s => {
                const img = document.createElement('div');
                img.className = 'sticker-img';
                img.style.backgroundImage = `url('${s.url}')`;
                img.title = s.name;
                stickerMgrGrid.appendChild(img);
            });
        }
    }

    addStickersBtn.addEventListener('click', () => {
        const text = prompt('请粘贴表情包文本 (支持智能识别, 每行一个):');
        if(!text) return;
        
        const group = stickerGroups.find(g => g.id === currentStickerGroupId);
        if(!group) return;

        const lines = text.split('\n');
        let added = 0;
        lines.forEach(line => {
            line = line.trim();
            if(!line) return;
            
            const httpIndex = line.indexOf('http');
            if (httpIndex !== -1) {
                let name = line.substring(0, httpIndex).trim();
                // 剔除末尾的中英文冒号或多余空格
                name = name.replace(/[:：\s]+$/, '');
                
                const url = line.substring(httpIndex).trim();
                
                if (url.startsWith('http')) {
                    if (!name) name = '表情' + (group.stickers.length + added + 1);
                    group.stickers.push({ name, url });
                    added++;
                }
            }
        });
        
        if(added > 0) {
            safeSetItem('chat_sticker_groups', JSON.stringify(stickerGroups));
            renderStickerMgrGrid();
            alert(`成功导入 ${added} 个表情包！`);
        } else {
            alert('未能解析到符合格式的数据。确保每行包含 http 或 https 链接。');
        }
    });

    // 聊天底部的表情包抽屉渲染
    function renderChatStickerDrawer() {
        stickerDrawerTabs.innerHTML = '';
        stickerDrawerGrid.innerHTML = '';
        
        if(stickerGroups.length === 0) {
            stickerDrawerGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#888; margin-top:20px;">暂无表情包，请点击左下角+号进入管理添加</div>';
            return;
        }

        let activeGroupId = stickerGroups[0].id;

        const renderGrid = (groupId) => {
            stickerDrawerGrid.innerHTML = '';
            const g = stickerGroups.find(x => x.id === groupId);
            if(!g || g.stickers.length === 0) return;
            g.stickers.forEach(s => {
                const img = document.createElement('div');
                img.className = 'sticker-img';
                img.style.backgroundImage = `url('${s.url}')`;
                img.addEventListener('click', () => {
                    // 发送带有 alt 标签的 img 标签，方便AI识别
                    sendMsg('me', `<img src="${s.url}" alt="[表情包:${s.name}]" style="max-width:120px; border-radius:8px;">`);
                    hideAllDrawers();
                });
                stickerDrawerGrid.appendChild(img);
            });
        };

        stickerGroups.forEach((group, index) => {
            const tab = document.createElement('div');
            tab.className = `sticker-tab ${index === 0 ? 'active' : ''}`;
            tab.innerText = group.name;
            tab.addEventListener('click', () => {
                Array.from(stickerDrawerTabs.children).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderGrid(group.id);
            });
            stickerDrawerTabs.appendChild(tab);
        });

        renderGrid(activeGroupId);
    }

    // 设置与世界书相关元素
    const settingsBtn = document.getElementById('nav-item-2');
    const settingsPage = document.getElementById('settings-page');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    
    const navApiSettings = document.getElementById('nav-api-settings');
    const apiSettingsPage = document.getElementById('api-settings-page');
    const closeApiSettingsBtn = document.getElementById('close-api-settings-btn');
    const saveApiBtn = document.getElementById('save-api-btn');
    
    const worldBookBtn = document.getElementById('app-item-2');
    const worldBookPage = document.getElementById('worldbook-page');
    const closeWbBtn = document.getElementById('close-wb-btn');
    const wbNavBtns = document.querySelectorAll('.wb-nav-btn');
    const wbGlobalGrid = document.getElementById('wb-global-grid');
    const wbLocalGrid = document.getElementById('wb-local-grid');
    const wbHeaderTitle = document.getElementById('wb-header-title');
    
    const wbAddModal = document.getElementById('wb-add-modal');
    const wbAddContentBtn = document.getElementById('wb-add-content-btn');
    const closeWbAddBtn = document.getElementById('close-wb-add-btn');
    
    // API设置相关元素
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    const modelSelectGroup = document.getElementById('model-select-group');
    const apiModelSelect = document.getElementById('api-model-select');
    const apiModelNameInput = document.getElementById('api-model-name');

    const apiPresetSelect = document.getElementById('api-preset-select');
    const apiSavePresetBtn = document.getElementById('api-save-preset-btn');
    const apiDelPresetBtn = document.getElementById('api-del-preset-btn');

    // 初始化API设置数据
    const loadApiSettings = () => {
        const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        
        renderApiPresets(apiData);

        apiModelNameInput.value = apiData.modelName || '';
        document.getElementById('api-url').value = apiData.url || '';
        document.getElementById('api-key').value = apiData.key || '';
        
        if (apiData.fetchedModels && apiData.fetchedModels.length > 0) {
            populateModelSelect(apiData.fetchedModels);
            apiModelSelect.value = apiData.selectedModel || '';
            modelSelectGroup.style.display = 'flex';
        }
    };

    function renderApiPresets(apiData) {
        apiPresetSelect.innerHTML = '<option value="">默认预设</option>';
        if (apiData.presets) {
            Object.keys(apiData.presets).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                apiPresetSelect.appendChild(opt);
            });
        }
        apiPresetSelect.value = apiData.currentPreset || '';
    }

    apiPresetSelect.addEventListener('change', (e) => {
        const name = e.target.value;
        const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        if (name && apiData.presets && apiData.presets[name]) {
            const p = apiData.presets[name];
            document.getElementById('api-url').value = p.url || '';
            document.getElementById('api-key').value = p.key || '';
            apiModelNameInput.value = p.modelName || '';
            apiModelSelect.value = p.selectedModel || '';
        } else {
            document.getElementById('api-url').value = '';
            document.getElementById('api-key').value = '';
            apiModelNameInput.value = '';
            apiModelSelect.value = '';
        }
        apiData.currentPreset = name;
        localStorage.setItem('api_settings', JSON.stringify(apiData));
    });

    apiSavePresetBtn.addEventListener('click', () => {
        const name = prompt('请输入预设名称:');
        if (!name || !name.trim()) return;
        const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        if (!apiData.presets) apiData.presets = {};
        
        let finalModel = apiModelNameInput.value.trim();
        if(!finalModel && apiModelSelect.value) finalModel = apiModelSelect.value;

        apiData.presets[name.trim()] = {
            url: document.getElementById('api-url').value.trim(),
            key: document.getElementById('api-key').value.trim(),
            modelName: finalModel,
            selectedModel: apiModelSelect.value
        };
        apiData.currentPreset = name.trim();
        localStorage.setItem('api_settings', JSON.stringify(apiData));
        renderApiPresets(apiData);
        alert('预设保存成功');
    });

    apiDelPresetBtn.addEventListener('click', () => {
        const name = apiPresetSelect.value;
        if (!name) return;
        const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        if (apiData.presets && apiData.presets[name]) {
            delete apiData.presets[name];
            apiData.currentPreset = '';
            localStorage.setItem('api_settings', JSON.stringify(apiData));
            renderApiPresets(apiData);
        }
    });


    function populateModelSelect(models) {
        apiModelSelect.innerHTML = '<option value="">请选择模型...</option>';
        models.forEach(model => {
            const opt = document.createElement('option');
            opt.value = model.id;
            opt.textContent = model.id;
            apiModelSelect.appendChild(opt);
        });
        modelSelectGroup.style.display = 'flex';
    }

    fetchModelsBtn.addEventListener('click', async () => {
        let url = document.getElementById('api-url').value.trim();
        const key = document.getElementById('api-key').value.trim();
        
        if (!url || !key) {
            alert('请先填写URL和API秘钥');
            return;
        }

        // 规范化URL
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1')) url += '/v1';
        const modelsUrl = `${url}/models`;

        const originalHtml = fetchModelsBtn.innerHTML;
        fetchModelsBtn.innerHTML = `<i class='bx bx-loader-alt spin'></i><span>拉取中...</span>`;
        fetchModelsBtn.disabled = true;

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // Read response text for NAI specific errors
                const errText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
            }
            
            const data = await response.json();
            if (data && data.data && Array.isArray(data.data)) {
                populateModelSelect(data.data);
                // 自动选择第一个
                if(data.data.length > 0) apiModelSelect.value = data.data[0].id;
                
                // 暂时保存拉取到的列表到本地存储，以便重新打开时还能看到
                const apiData = JSON.parse(localStorage.getItem('api_settings') || '{}');
                apiData.fetchedModels = data.data;
                localStorage.setItem('api_settings', JSON.stringify(apiData));
            } else {
                throw new Error('返回数据格式不正确');
            }
        } catch (error) {
            console.error('Fetch models error:', error);
            alert('拉取模型失败，请检查URL、秘钥或网络连接。\n错误信息: ' + error.message);
        } finally {
            fetchModelsBtn.innerHTML = originalHtml;
            fetchModelsBtn.disabled = false;
        }
    });

    apiModelSelect.addEventListener('change', () => {
        // 当选择了下拉框的模型时，同步到名称输入框
        if(apiModelSelect.value) {
            apiModelNameInput.value = apiModelSelect.value;
        }
    });

    // 设置页面路由逻辑
    settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        homePage.style.display = 'none';
        settingsPage.style.display = 'flex';
    });
    closeSettingsBtn.addEventListener('click', () => {
        settingsPage.style.display = 'none';
        homePage.style.display = 'flex';
    });

    // API设置页面逻辑
    navApiSettings.addEventListener('click', () => {
        loadApiSettings();
        apiSettingsPage.style.display = 'flex';
    });
    closeApiSettingsBtn.addEventListener('click', () => {
        apiSettingsPage.style.display = 'none';
    });
    saveApiBtn.addEventListener('click', () => {
        // 优先使用手动输入的模型名称，如果没有，则使用下拉框选中的
        let finalModel = apiModelNameInput.value.trim();
        if(!finalModel && apiModelSelect.value) {
            finalModel = apiModelSelect.value;
        }

        const currentData = JSON.parse(localStorage.getItem('api_settings') || '{}');
        const apiData = {
            ...currentData,
            modelName: finalModel,
            selectedModel: apiModelSelect.value,
            url: document.getElementById('api-url').value.trim(),
            key: document.getElementById('api-key').value.trim(),
            currentPreset: apiPresetSelect.value
        };
        localStorage.setItem('api_settings', JSON.stringify(apiData));
        apiSettingsPage.style.display = 'none';
        // 不弹出原生alert，静默保存符合韩系高级感
    });

    // 世界书页面逻辑
    worldBookBtn.addEventListener('click', (e) => {
        e.preventDefault();
        homePage.style.display = 'none';
        worldBookPage.style.display = 'flex';
    });
    closeWbBtn.addEventListener('click', () => {
        worldBookPage.style.display = 'none';
        homePage.style.display = 'flex';
    });

    wbNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            wbNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.target;
            if(target === 'global') {
                wbGlobalGrid.style.display = 'grid';
                wbLocalGrid.style.display = 'none';
                wbHeaderTitle.innerText = '全局';
            } else {
                wbGlobalGrid.style.display = 'none';
                wbLocalGrid.style.display = 'grid';
                wbHeaderTitle.innerText = '局部';
            }
        });
    });

    wbAddContentBtn.addEventListener('click', () => {
        document.getElementById('wb-input-title').value = '';
        document.getElementById('wb-input-content').value = '';
        wbAddModal.style.display = 'flex';
    });
    closeWbAddBtn.addEventListener('click', () => {
        wbAddModal.style.display = 'none';
    });
    document.getElementById('save-wb-btn').addEventListener('click', () => {
        // Here you would add logic to save the world book content
        wbAddModal.style.display = 'none';
    });

    // 渲染联系人列表
    function renderContacts() {
        const container = document.getElementById('contact-list-container');
        const emptyState = document.getElementById('contacts-empty');
        container.innerHTML = '';
        
        if (contacts.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            contacts.forEach(contact => {
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.innerHTML = `
                    <div class="contact-item-avatar" style="background-image: url('${contact.avatar || ''}')"></div>
                    <div class="contact-item-info">
                        <div class="contact-item-name">${contact.name || '未命名'}</div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    openEditContactPage(contact);
                });
                container.appendChild(item);
            });
        }
    }

    function openEditContactPage(contact) {
        editingContactId = contact.id;
        document.getElementById('contact-input-name').value = contact.name || '';
        document.getElementById('contact-input-gender').value = contact.gender || '';
        document.getElementById('contact-input-age').value = contact.age || '';
        document.getElementById('contact-input-opening').value = contact.opening || '';
        document.getElementById('contact-input-desc').value = contact.desc || '';
        currentContactAvatarBase64 = contact.avatar || '';
        if (currentContactAvatarBase64) {
            contactAvatarPreview.style.backgroundImage = `url('${currentContactAvatarBase64}')`;
            contactAvatarPreview.classList.add('has-photo');
        } else {
            contactAvatarPreview.style.backgroundImage = 'none';
            contactAvatarPreview.classList.remove('has-photo');
        }
        addContactPage.style.display = 'flex';
        document.querySelector('.add-contact-header h2').innerText = '编辑人设';
    }

    // 渲染聊天列表
    function renderChatList() {
        const container = document.getElementById('chat-list-container');
        const emptyState = document.getElementById('messages-empty');
        container.innerHTML = '';
        
        if (chatList.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            chatList.forEach(chat => {
                const contact = contacts.find(c => c.id === chat.contactId);
                if(!contact) return;
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.innerHTML = `
                    <div class="contact-item-avatar" style="background-image: url('${contact.avatar || ''}')"></div>
                    <div class="contact-item-info">
                        <div class="contact-item-name">${contact.name || '未命名'}</div>
                        <div style="font-size:12px; color:#888; margin-top:4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${contact.opening || ''}</div>
                    </div>
                `;
                item.addEventListener('click', () => openConversation(contact));
                container.appendChild(item);
            });
        }
    }

    // 渲染选择联系人列表
    // 打开聊天对话页面
    function openConversation(contact) {
        currentActiveContactId = contact.id;
        convHeaderName.innerText = contact.name || '未命名';
        convHeaderAvatar.style.backgroundImage = `url('${contact.avatar || ''}')`;
        const profile = roleProfiles[contact.id] || {};
        const statusEl = document.getElementById('conv-header-status');
        if (statusEl) statusEl.innerText = profile.lastState || '在线';
        
        // 初始化学人设对话 (如果没有记录，把开场白作为第一条消息)
        if (!messagesData[contact.id]) {
            messagesData[contact.id] = [];
            if (contact.opening) {
                messagesData[contact.id].push({
                    sender: 'them',
                    text: contact.opening,
                    time: Date.now()
                });
                localStorage.setItem('chat_messages', JSON.stringify(messagesData));
            }
        }
        
        applyChatBackground(profile.chatBg || '');
        applyCustomCss(profile.customCss || '');

        renderMessages();
        chatConversationPage.style.display = 'flex';
        // 滚动到底部
        setTimeout(() => { convMessagesContainer.scrollTop = convMessagesContainer.scrollHeight; }, 50);
    }

    // 渲染对话消息
    function renderMessages() {
        if (!currentActiveContactId) return;
        const msgs = messagesData[currentActiveContactId] || [];
        const contact = contacts.find(c => c.id === currentActiveContactId);
        const profile = roleProfiles[currentActiveContactId] || {};
        const avatarUrl = contact ? (contact.avatar || '') : '';
        const userAvatarUrl = profile.userAvatar || '';
        
        convMessagesContainer.innerHTML = '';
        
        // 默认用户头像 Base64 或占位
        const defaultUserAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

        for (let i = 0; i < msgs.length; i++) {
            const msg = msgs[i];
            const isMe = msg.sender === 'me';
            
            // 撤回的消息
            if (msg.recalled) {
                const row = document.createElement('div');
                row.className = 'msg-recalled';
                row.innerText = isMe ? '你撤回了一条消息' : `"${contact.name || '对方'}" 撤回了一条消息`;
                convMessagesContainer.appendChild(row);
                continue;
            }
            
            // 判断是否是连续发消息
            let isPrevSame = false;
            if (i > 0) {
                let prev = msgs[i-1];
                if (!prev.recalled && prev.sender === msg.sender) isPrevSame = true;
            }
            let isNextSame = false;
            if (i < msgs.length - 1) {
                let next = msgs[i+1];
                if (!next.recalled && next.sender === msg.sender) isNextSame = true;
            }
            
            const row = document.createElement('div');
            row.className = `msg-row ${isMe ? 'sent' : 'received'}`;
            
            // 连续消息处理：不是最后一条则隐藏尾巴
            if (isNextSame) row.classList.add('hide-tail');
            // 连续消息处理：不是第一条则隐藏头像
            if (isPrevSame) row.classList.add('hide-avatar');

            let quoteHtml = '';
            if (msg.quote) {
                quoteHtml = `<div class="msg-quote">${msg.quote}</div>`;
            }

            let checkboxHtml = `<div class="msg-checkbox ${selectedMsgIndices.has(i) ? 'checked' : ''}" data-index="${i}"></div>`;
            
            let finalUserAvatar = userAvatarUrl || defaultUserAvatar;
            let avatarDisplayUrl = isMe ? finalUserAvatar : avatarUrl;

            let innerHtml = '';
            
            // 解析转账
            let transferMatch = msg.text.match(/^\[转账:([^\]:]+)(?::([^\]]+))?\]$/);
            let textImgMatch = msg.text.match(/^\[文字图:([\s\S]*?)\]$/);
            let isTransfer = false;
            let isVoice = false;
            let isTextImg = false;
            
            if (transferMatch) {
                isTransfer = true;
                let amount = transferMatch[1];
                let note = transferMatch[2] || '';
                let txStatus = msg.txStatus || 'PENDING'; // PENDING, ACCEPTED, REJECTED
                
                let actionsHtml = '';
                let statusText = isMe ? '等待对方收款' : '等待你收款';
                
                if (txStatus === 'PENDING') {
                    if (!isMe) {
                        actionsHtml = `
                            <div class="ptc-actions">
                                <button class="ptc-btn reject" onclick="handleTransfer(${i}, 'REJECTED'); event.stopPropagation();">Reject</button>
                                <button class="ptc-btn accept" onclick="handleTransfer(${i}, 'ACCEPTED'); event.stopPropagation();">Accept</button>
                            </div>
                        `;
                    }
                } else if (txStatus === 'ACCEPTED') {
                    statusText = '已收款';
                } else if (txStatus === 'REJECTED') {
                    statusText = '已退回';
                }

                innerHtml = `
                    <div class="ptc-card" data-index="${i}">
                        <div class="ptc-header">
                            <i class='bx ${txStatus === 'ACCEPTED' ? 'bx-check-circle' : (txStatus === 'REJECTED' ? 'bx-x-circle' : 'bx-lock-alt')}'></i>
                            <span>${txStatus === 'ACCEPTED' ? 'COMPLETED' : (txStatus === 'REJECTED' ? 'REJECTED' : 'SECURE TRANSFER')}</span>
                        </div>
                        <div class="ptc-body">
                            <div class="ptc-amount">¥${amount}</div>
                            <div class="ptc-status">${statusText}</div>
                            ${note ? `<div class="ptc-note">"${note}"</div>` : ''}
                        </div>
                        ${actionsHtml}
                    </div>
                `;
            } else if (textImgMatch) {
                isTextImg = true;
                let content = textImgMatch[1].replace(/</g, '<').replace(/>/g, '>').replace(/\n/g, '<br>');
                innerHtml = `
                    <div class="text-image-direct">
                        ${content}
                    </div>
                `;
            } else {
                // 解析语音
                let voiceMatch = msg.text.match(/^\[语音:(.*?):(.*?)\]$/);
                if (voiceMatch) {
                    isVoice = true;
                    let text = voiceMatch[1];
                    let duration = parseInt(voiceMatch[2]) || 1;
                    let minW = 70;
                    let maxW = 220;
                    let calculatedWidth = Math.min(maxW, minW + (duration * 6));
                    
                    innerHtml = `
                        <div class="voice-bubble" style="width: ${calculatedWidth}px;" onclick="toggleVoiceText(this); event.stopPropagation();">
                            <i class='bx bx-wifi voice-icon'></i>
                            <span>${duration}"</span>
                        </div>
                        <div class="voice-text-result">${text}</div>
                    `;
                } else {
                    innerHtml = `<div class="msg-bubble" data-index="${i}">${quoteHtml}${msg.text}</div>`;
                }
            }

            if (isTransfer || isVoice) {
                row.innerHTML = `
                    ${checkboxHtml}
                    <div class="msg-avatar" style="${avatarDisplayUrl.startsWith('data:image/svg') ? `background-image: url('${avatarDisplayUrl}'); background-color: #bbb; background-size: 80%; background-repeat: no-repeat;` : `background-image: url('${avatarDisplayUrl}')`}"></div>
                    <div class="msg-bubble-col" data-index="${i}" style="position:relative;">${innerHtml}</div>
                `;
            } else {
                row.innerHTML = `
                    ${checkboxHtml}
                    <div class="msg-avatar" style="${avatarDisplayUrl.startsWith('data:image/svg') ? `background-image: url('${avatarDisplayUrl}'); background-color: #bbb; background-size: 80%; background-repeat: no-repeat;` : `background-image: url('${avatarDisplayUrl}')`}"></div>
                    ${innerHtml}
                `;
            }
            
            row.addEventListener('click', (e) => {
                if (isMultiSelectMode) {
                    const cb = row.querySelector('.msg-checkbox');
                    if (selectedMsgIndices.has(i)) {
                        selectedMsgIndices.delete(i);
                        cb.classList.remove('checked');
                    } else {
                        selectedMsgIndices.add(i);
                        cb.classList.add('checked');
                    }
                }
            });

            convMessagesContainer.appendChild(row);
        }
    }

    // 发送消息逻辑 (回车发送)
    convMsgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && convMsgInput.value.trim() !== '') {
            const text = convMsgInput.value.trim();
            sendMsg('me', text);
            convMsgInput.value = '';
        }
    });

    // 全局方法挂载 (文字图、语音与转账交互)
    window.showTextViewer = function(index) {
        // No longer used, text image is directly rendered
    };
    
    const tvModal = document.getElementById('text-viewer-modal');
    const tvBg = document.getElementById('close-text-viewer-bg');
    if(tvBg) tvBg.addEventListener('click', () => { if(tvModal) tvModal.style.display = 'none'; });

    window.toggleVoiceText = function(element) {
        const textResult = element.nextElementSibling;
        if(textResult && textResult.classList.contains('voice-text-result')) {
            textResult.classList.toggle('show');
        }
    };
    
    window.handleTransfer = function(index, status) {
        if (!currentActiveContactId) return;
        if (messagesData[currentActiveContactId] && messagesData[currentActiveContactId][index]) {
            messagesData[currentActiveContactId][index].txStatus = status;
            localStorage.setItem('chat_messages', JSON.stringify(messagesData));
            renderMessages();
        }
    };

    function sendMsg(sender, text) {
        if(!currentActiveContactId) return;
        if(!messagesData[currentActiveContactId]) messagesData[currentActiveContactId] = [];
        
        const newMsg = {
            sender: sender,
            text: text,
            time: Date.now()
        };
        
        if (sender === 'me' && window.currentQuoteText) {
            newMsg.quote = window.currentQuoteText;
            window.currentQuoteText = '';
            document.getElementById('quote-preview-area').style.display = 'none';
        }

        messagesData[currentActiveContactId].push(newMsg);
        localStorage.setItem('chat_messages', JSON.stringify(messagesData));
        renderMessages();
        setTimeout(() => { convMessagesContainer.scrollTop = convMessagesContainer.scrollHeight; }, 50);
    }

    convBackBtn.addEventListener('click', () => {
        chatConversationPage.style.display = 'none';
        currentActiveContactId = null;
    });

    function renderSelectContacts() {
        const container = document.getElementById('select-contact-list-container');
        const emptyState = document.getElementById('select-contacts-empty');
        container.innerHTML = '';
        
        if (contacts.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            contacts.forEach(contact => {
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.innerHTML = `
                    <div class="contact-item-avatar" style="background-image: url('${contact.avatar || ''}')"></div>
                    <div class="contact-item-info">
                        <div class="contact-item-name">${contact.name || '未命名'}</div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    // 添加到聊天列表
                    if (!chatList.find(c => c.contactId === contact.id)) {
                        chatList.push({ contactId: contact.id, lastMessageTime: Date.now() });
                        localStorage.setItem('chat_list', JSON.stringify(chatList));
                        renderChatList();
                    }
                    selectContactModal.style.display = 'none';
                });
                container.appendChild(item);
            });
        }
    }

    // 打开聊天软件
    function switchChatTab(targetId, title) {
        // 更新导航高亮
        chatNavItems.forEach(nav => {
            if (nav.dataset.target === targetId) {
                nav.classList.add('active');
                // 切换图标样式 (实心/空心)
                const i = nav.querySelector('i');
                if(targetId === 'messages') i.className = 'bx bxs-message-rounded';
                if(targetId === 'contacts') i.className = 'bx bxs-contact';
                if(targetId === 'moments') i.className = 'bx bx-world'; // 假设世界图标代表朋友圈
            } else {
                nav.classList.remove('active');
                const i = nav.querySelector('i');
                if(nav.dataset.target === 'messages') i.className = 'bx bx-message-rounded';
                if(nav.dataset.target === 'contacts') i.className = 'bx bx-contact';
                if(nav.dataset.target === 'moments') i.className = 'bx bx-world';
            }
        });

        // 更新面板显示
        chatViewPanels.forEach(panel => {
            if (panel.id === `chat-view-${targetId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // 更新标题
        chatHeaderTitle.innerText = title;
        
        // 更新右上角按钮显示
        addFriendBtn.style.display = targetId === 'messages' ? 'block' : 'none';
        addContactBtn.style.display = targetId === 'contacts' ? 'block' : 'none';
        
        if (targetId === 'contacts') renderContacts();
        if (targetId === 'messages') renderChatList();
    }

    // 添加联系人页面逻辑
    addContactBtn.addEventListener('click', () => {
        editingContactId = null;
        addContactPage.style.display = 'flex';
        document.querySelector('.add-contact-header h2').innerText = '添加人设';
        // 清空表单
        document.getElementById('contact-input-name').value = '';
        document.getElementById('contact-input-gender').value = '';
        document.getElementById('contact-input-age').value = '';
        document.getElementById('contact-input-opening').value = '';
        document.getElementById('contact-input-desc').value = '';
        contactAvatarPreview.style.backgroundImage = 'none';
        contactAvatarPreview.classList.remove('has-photo');
        currentContactAvatarBase64 = '';
    });

    closeAddContactBtn.addEventListener('click', () => {
        addContactPage.style.display = 'none';
    });

    contactAvatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            currentContactAvatarBase64 = event.target.result;
            contactAvatarPreview.style.backgroundImage = `url('${currentContactAvatarBase64}')`;
            contactAvatarPreview.classList.add('has-photo');
        };
        reader.readAsDataURL(file);
    });

    saveContactBtn.addEventListener('click', () => {
        const name = document.getElementById('contact-input-name').value.trim();
        if (!name) { alert('请输入姓名'); return; }
        
        if (editingContactId) {
            const contactIndex = contacts.findIndex(c => c.id === editingContactId);
            if (contactIndex !== -1) {
                contacts[contactIndex].name = name;
                contacts[contactIndex].gender = document.getElementById('contact-input-gender').value.trim();
                contacts[contactIndex].age = document.getElementById('contact-input-age').value.trim();
                contacts[contactIndex].opening = document.getElementById('contact-input-opening').value.trim();
                contacts[contactIndex].desc = document.getElementById('contact-input-desc').value.trim();
                contacts[contactIndex].avatar = currentContactAvatarBase64;
            }
        } else {
            const newContact = {
                id: 'c_' + Date.now(),
                name: name,
                gender: document.getElementById('contact-input-gender').value.trim(),
                age: document.getElementById('contact-input-age').value.trim(),
                opening: document.getElementById('contact-input-opening').value.trim(),
                desc: document.getElementById('contact-input-desc').value.trim(),
                avatar: currentContactAvatarBase64
            };
            contacts.push(newContact);
        }
        
        localStorage.setItem('chat_contacts', JSON.stringify(contacts));
        
        renderContacts();
        renderChatList();
        addContactPage.style.display = 'none';
    });

    // 添加好友到聊天列表逻辑
    addFriendBtn.addEventListener('click', () => {
        renderSelectContacts();
        selectContactModal.style.display = 'flex';
    });

    closeSelectContactBtn.addEventListener('click', () => {
        selectContactModal.style.display = 'none';
    });

    beautifyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        homePage.style.display = 'none';
        beautifyPage.style.display = 'flex';
    });

    chatAppBtn.addEventListener('click', (e) => {
        e.preventDefault();
        homePage.style.display = 'none';
        chatAppPage.style.display = 'flex';
        // 每次进入默认显示聊天页面
        switchChatTab('messages', '聊天');
    });

    // 关闭聊天软件
    closeChatBtn.addEventListener('click', () => {
        homePage.style.display = 'flex';
        chatAppPage.style.display = 'none';
    });

    // 聊天底部导航切换
    chatNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            const title = item.querySelector('span').innerText;
            switchChatTab(target, title);
        });
    });

    function switchChatTab(targetId, title) {
        // 更新导航高亮
        chatNavItems.forEach(nav => {
            if (nav.dataset.target === targetId) {
                nav.classList.add('active');
                // 切换图标样式 (实心/空心)
                const i = nav.querySelector('i');
                if(targetId === 'messages') i.className = 'bx bxs-message-rounded';
                if(targetId === 'contacts') i.className = 'bx bxs-contact';
                if(targetId === 'moments') i.className = 'bx bx-world'; // 假设世界图标代表朋友圈
            } else {
                nav.classList.remove('active');
                const i = nav.querySelector('i');
                if(nav.dataset.target === 'messages') i.className = 'bx bx-message-rounded';
                if(nav.dataset.target === 'contacts') i.className = 'bx bx-contact';
                if(nav.dataset.target === 'moments') i.className = 'bx bx-world';
            }
        });

        // 更新面板显示
        chatViewPanels.forEach(panel => {
            if (panel.id === `chat-view-${targetId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // 更新标题
        chatHeaderTitle.innerText = title;
        
        // 更新右上角按钮显示
        addFriendBtn.style.display = targetId === 'messages' ? 'block' : 'none';
        addContactBtn.style.display = targetId === 'contacts' ? 'block' : 'none';
        
        if (targetId === 'contacts') renderContacts();
        if (targetId === 'messages') renderChatList();
    }

    beautifyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        homePage.style.display = 'none';
        beautifyPage.style.display = 'flex';
    });
    backBtn.addEventListener('click', () => {
        homePage.style.display = 'flex';
        beautifyPage.style.display = 'none';
    });
    const wallpaperThumbs = document.querySelectorAll('.wallpaper-thumb');
    const uploadWallpaperInput = document.getElementById('upload-wallpaper');
    const applyWallpaper = (url) => {
        phoneScreen.style.backgroundImage = `url(${url})`;
        localStorage.setItem('selectedWallpaper', url);
        wallpaperThumbs.forEach(t => t.classList.remove('active'));
        const activeThumb = [...wallpaperThumbs].find(t => t.dataset.wallpaper === url);
        if (activeThumb) activeThumb.classList.add('active');
    };
    wallpaperThumbs.forEach(thumb => {
        thumb.style.backgroundImage = `url(${thumb.dataset.wallpaper})`;
        thumb.addEventListener('click', () => applyWallpaper(thumb.dataset.wallpaper));
    });
    uploadWallpaperInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => applyWallpaper(event.target.result);
        reader.readAsDataURL(file);
    });
    const customIconGrid = document.getElementById('custom-icon-grid');
    const customizableIcons = document.querySelectorAll('.icon-customizable');
    const hiddenInputsContainer = document.getElementById('hidden-file-inputs');
    const applyCustomIcon = (itemId, imageUrl) => {
        const item = document.getElementById(itemId);
        if(item) {
            item.style.backgroundImage = `url('${imageUrl}')`;
            item.classList.add('has-custom-icon');
            localStorage.setItem(`custom-icon-${itemId}`, imageUrl);
        }
    };
    customizableIcons.forEach(iconItem => {
        const itemId = iconItem.id;
        if (!itemId) return;
        const originalIconHTML = iconItem.querySelector('i')?.outerHTML || '';
        const placeholder = document.createElement('label');
        placeholder.htmlFor = `upload-icon-${itemId}`;
        placeholder.className = 'icon-placeholder';
        placeholder.innerHTML = originalIconHTML;
        customIconGrid.appendChild(placeholder);
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `upload-icon-${itemId}`;
        fileInput.className = 'hidden-file-input';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if(!file) return;
            const reader = new FileReader();
            reader.onload = (event) => applyCustomIcon(itemId, event.target.result);
            reader.readAsDataURL(file);
        });
        hiddenInputsContainer.appendChild(fileInput);
    });
    const fontFamilyInput = document.getElementById('font-family-input');
    const fontUrlInput = document.getElementById('font-url-input');
    const fontFileInput = document.getElementById('font-file-input');
    const fontStyleTag = document.getElementById('custom-font-style-tag');
    const applyAndSaveFont = ({ family, url, dataUrl }) => {
        if (!family) { alert('必须为字体命名！'); return; }
        let src = '';
        if (url) src = `url('${url}')`;
        if (dataUrl) src = `url('${dataUrl}')`;
        if (!src) { return; }
        const fontFaceRule = `@font-face { font-family: '${family}'; src: ${src}; }`;
        fontStyleTag.innerHTML = fontFaceRule;
        document.documentElement.style.setProperty('--font-main', `'${family}', sans-serif`);
        localStorage.setItem('customFontFamily', family);
        localStorage.setItem('customFontUrl', url || '');
        localStorage.setItem('customFontDataUrl', dataUrl || '');
        if(!localStorage.getItem('font-alert-shown')){alert(`字体 '${family}' 已应用!`);localStorage.setItem('font-alert-shown','true')}
    };
    fontUrlInput.addEventListener('blur', () => {
        localStorage.removeItem('font-alert-shown');
        const family = fontFamilyInput.value.trim();
        const url = fontUrlInput.value.trim();
        if (family && url) applyAndSaveFont({ family, url });
    });
    fontFileInput.addEventListener('change', (e) => {
        localStorage.removeItem('font-alert-shown');
        const file = e.target.files[0];
        const family = fontFamilyInput.value.trim();
        if (!file || !family) { alert('上传文件前，请先为字体命名!'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (event) => { applyAndSaveFont({ family: family, dataUrl: event.target.result }); };
        reader.readAsDataURL(file);
    });
    const createWidgetFileInput=(id,target)=>{const i=document.createElement('input');i.type='file';i.id=id;i.className='hidden-file-input';i.accept='image/*';i.dataset.target=target;hiddenInputsContainer.appendChild(i);return i;};
    const widgetInputs=[['upload-top-1','image-target-top-1'],['upload-top-2','image-target-top-2'],['upload-top-3','image-target-top-3'],['upload-avatar-1','image-target-avatar-1'],['upload-avatar-2','image-target-avatar-2'],['upload-main-photo','image-target-main-photo'],['upload-profile-bg','profile-widget-bg']];
    widgetInputs.forEach(([id,target])=>{const i=createWidgetFileInput(id,target);i.addEventListener('change',handleWidgetImageUpload)});
    function handleWidgetImageUpload(event){const i=event.target,f=i.files[0];if(!f)return;const r=new FileReader;r.onload=e=>{const t=e.target.result,a=i.dataset.target,n=document.getElementById(a);if(n){n.style.backgroundImage=`url(${t})`;if(n.classList.contains('photo-widget'))n.classList.add('has-image');localStorage.setItem(a,t)}};r.readAsDataURL(f)}
    const loadWidgetImages=()=>{widgetInputs.forEach(([id,target])=>{const s=localStorage.getItem(target);if(s){const e=document.getElementById(target);if(e){e.style.backgroundImage=`url(${s})`;if(e.classList.contains('photo-widget'))e.classList.add('has-image');if(target==='profile-widget-bg')e.style.backgroundSize='cover';}}})};
    const editableTexts=document.querySelectorAll('[contenteditable="true"]');
    editableTexts.forEach(el=>el.addEventListener('blur',()=>localStorage.setItem(el.id,el.innerText)));
    const loadTexts=()=>editableTexts.forEach(el=>{const s=localStorage.getItem(el.id);if(s)el.innerText=s;});
    const updateTime=()=>{const e=document.getElementById('time');if(e){const n=new Date,h=String(n.getHours()).padStart(2,'0'),m=String(n.getMinutes()).padStart(2,'0');e.textContent=`${h}:${m}`}};
    const initBatteryAPI=()=>{const i=document.getElementById('battery-icon'),l=document.getElementById('battery-level');if('getBattery' in navigator){navigator.getBattery().then(b=>{const u=()=>{l.textContent=`${Math.round(b.level*100)}%`;i.className=b.charging?'bx bxs-battery-charging':'bx bxs-battery'};u();b.addEventListener('levelchange',u);b.addEventListener('chargingchange',u)})}else{i.parentElement.style.display='none'}};
    const loadSettings=()=>{
        loadWidgetImages();
        loadTexts();
        updateTime();
        initBatteryAPI();
        setInterval(updateTime,10000);
        const savedWallpaper=localStorage.getItem('selectedWallpaper');
        if(savedWallpaper)applyWallpaper(savedWallpaper);
        customizableIcons.forEach(item=>{const savedIcon=localStorage.getItem(`custom-icon-${item.id}`);if(savedIcon)applyCustomIcon(item.id,savedIcon);});
        localStorage.setItem('font-alert-shown', 'true');
        const savedFontFamily=localStorage.getItem('customFontFamily');
        if(savedFontFamily){
            const savedFontUrl=localStorage.getItem('customFontUrl');
            const savedFontDataUrl=localStorage.getItem('customFontDataUrl');
            applyAndSaveFont({family:savedFontFamily,url:savedFontUrl,dataUrl:savedFontDataUrl});
            fontFamilyInput.value=savedFontFamily;
            if(savedFontUrl)fontUrlInput.value=savedFontUrl;
        }
        localStorage.removeItem('font-alert-shown');
    };
    loadSettings();

    // 橡皮筋效果由CSS overscroll-behavior-y 控制，无需在此全局阻止滚动

    // 暴露核心接口供其他文件调用
    window.ChatApp = {
        contacts: contacts,
        chatList: chatList,
        messagesData: messagesData,
        stickerGroups: stickerGroups,
        roleProfiles: roleProfiles,
        sendMsg: sendMsg,
        renderMessages: renderMessages,
        hideAllDrawers: hideAllDrawers,
        applyChatBackground: applyChatBackground,
        applyCustomCss: applyCustomCss
    };
    
});
