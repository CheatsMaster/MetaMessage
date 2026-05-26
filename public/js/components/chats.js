import { state, setState } from '../state.js';
import { chatsAPI, usersAPI } from '../api.js';
import { escapeHtml, showToast } from '../utils.js';
import { viewUserProfile } from './profile.js';

let refreshInterval = null;

export async function renderChats(container) {
    try {
        const chats = await chatsAPI.getChats();
        
        if (chats.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #A1A1AA;">Нет чатов. Начните диалог через поиск!</div>';
        } else {
            container.innerHTML = chats.map(chat => `
                <div class="chat-item" data-chat-id="${chat.id}" onclick="window.openChat('${chat.id}')">
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(chat.name || 'Личный чат')}</div>
                        <div style="font-size: 12px; color: #A1A1AA;">${escapeHtml(chat.last_message?.content || 'Нет сообщений')}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${chat.unread_count > 0 ? `<span style="background: #EF4444; border-radius: 50%; width: 8px; height: 8px;"></span>` : ''}
                        <div style="font-size: 12px; color: #A1A1AA;">${chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString() : ''}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        container.innerHTML = '<div class="card" style="text-align: center;">Ошибка загрузки чатов</div>';
    }
}

export async function startChat(userId) {
    try {
        if (userId === state.currentUser?.user?.id) {
            showToast('Нельзя начать чат с самим собой', 'error');
            return;
        }
        const chat = await chatsAPI.getOrCreatePrivate(userId);
        await openChat(chat.id);
        window.switchPage('chats');
    } catch (error) {
        console.error('Ошибка создания чата:', error);
        showToast('Не удалось начать чат: ' + error.message, 'error');
    }
}

window.openChat = async (chatId) => {
    setState({ currentChat: chatId });
    
    document.getElementById('chatsListCard').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'block';
    
    await loadChatUserInfo(chatId);
    await loadMessages();
    
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (state.currentChat) loadMessages();
    }, 3000);
};

async function loadChatUserInfo(chatId) {
    try {
        const messages = await chatsAPI.getMessages(chatId);
        const otherSender = messages.find(m => m.sender_id !== state.currentUser?.user?.id);
        if (otherSender) {
            setState({ currentChatUser: otherSender.profiles });
            document.getElementById('chatUserName').textContent = otherSender.profiles?.username || 'Пользователь';
            document.getElementById('chatAvatar').textContent = (otherSender.profiles?.username?.[0] || 'U').toUpperCase();
        } else {
            const participants = await chatsAPI.getParticipants(chatId);
            const otherUser = participants.find(p => p.user_id !== state.currentUser?.user?.id);
            if (otherUser) {
                const user = await usersAPI.getProfile(otherUser.user_id);
                setState({ currentChatUser: user });
                document.getElementById('chatUserName').textContent = user.username || 'Пользователь';
                document.getElementById('chatAvatar').textContent = (user.username?.[0] || 'U').toUpperCase();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки информации о чате:', error);
    }
}

async function loadMessages() {
    if (!state.currentChat) return;
    try {
        const messages = await chatsAPI.getMessages(state.currentChat);
        const messagesDiv = document.getElementById('chatMessages');
        const wasAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 100;
        
        if (messages.length === 0) {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #A1A1AA;">Нет сообщений. Напишите что-нибудь!</div>';
        } else {
            messagesDiv.innerHTML = messages.map(msg => `
                <div class="message ${msg.sender_id === state.currentUser?.user?.id ? 'sent' : ''}">
                    <div class="message-bubble">
                        <div style="font-size: 11px; margin-bottom: 4px; color: #C084FC;">${escapeHtml(msg.profiles?.username)}</div>
                        ${escapeHtml(msg.content)}
                        <div style="font-size: 10px; margin-top: 4px; color: #A1A1AA;">${new Date(msg.created_at).toLocaleTimeString()}</div>
                    </div>
                </div>
            `).join('');
            if (wasAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

window.sendMessage = async () => {
    const input = document.getElementById('messageInput');
    const content = input.value;
    if (!content.trim() || !state.currentChat) return;
    
    try {
        await chatsAPI.sendMessage(state.currentChat, content);
        input.value = '';
        await loadMessages();
        await renderChats(document.getElementById('chatsList'));
    } catch (error) {
        showToast('Ошибка отправки сообщения', 'error');
    }
};

window.closeChat = () => {
    setState({ currentChat: null, currentChatUser: null });
    document.getElementById('chatsListCard').style.display = 'block';
    document.getElementById('chatWindow').style.display = 'none';
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    renderChats(document.getElementById('chatsList'));
};

window.viewChatUserProfile = () => {
    if (state.currentChatUser) {
        closeChat();
        viewUserProfile(state.currentChatUser.id);
    }
};

window.showChatMenu = () => {
    const options = confirm('Очистить чат?');
    if (options) {
        showToast('Функция в разработке', 'info');
    }
};

window.startChat = startChat;