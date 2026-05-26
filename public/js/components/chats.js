import { state, setState } from '../state.js';
import { chatsAPI, usersAPI } from '../api.js';
import { escapeHtml, showToast } from '../utils.js';
import { viewUserProfile } from './profile.js';

let refreshInterval = null;

export async function renderChats(container) {
    try {
        const chats = await chatsAPI.getChats();
        
        if (!chats || chats.length === 0) {
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

export async function openChat(chatId) {
    setState({ currentChat: chatId });
    
    const chatsCard = document.getElementById('chatsListCard');
    const chatWindow = document.getElementById('chatWindow');
    if (chatsCard) chatsCard.style.display = 'none';
    if (chatWindow) chatWindow.style.display = 'block';
    
    await loadChatUserInfo(chatId);
    await loadMessages();
    
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (state.currentChat) loadMessages();
    }, 3000);
}

async function loadChatUserInfo(chatId) {
    try {
        const messages = await chatsAPI.getMessages(chatId);
        const otherSender = messages.find(m => m.sender_id !== state.currentUser?.user?.id);
        if (otherSender) {
            setState({ currentChatUser: otherSender.profiles });
            const userNameEl = document.getElementById('chatUserName');
            const avatarEl = document.getElementById('chatAvatar');
            if (userNameEl) userNameEl.textContent = otherSender.profiles?.username || 'Пользователь';
            if (avatarEl) avatarEl.textContent = (otherSender.profiles?.username?.[0] || 'U').toUpperCase();
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
        if (!messagesDiv) return;
        
        const wasAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 100;
        
        if (!messages || messages.length === 0) {
            messagesDiv.innerHTML = '<div style="text-align: center; padding: 40px; color: #A1A1AA;">Нет сообщений. Напишите что-нибудь!</div>';
        } else {
            messagesDiv.innerHTML = messages.map(msg => `
                <div class="message ${msg.sender_id === state.currentUser?.user?.id ? 'sent' : ''}" data-message-id="${msg.id}" data-chat-id="${state.currentChat}">
                    <div class="message-bubble" style="position: relative; display: inline-block; min-width: 80px;">
                        ${msg.sender_id === state.currentUser?.user?.id ? `
                            <button class="message-menu-btn" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #C084FC; cursor: pointer; font-size: 14px; z-index: 5;">⋮</button>
                            <div class="message-menu-dropdown" id="msg-menu-${msg.id}" style="display: none; position: absolute; right: 25px; top: 0; background: #2A2A2A; border-radius: 12px; padding: 8px 0; min-width: 130px; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                                <button class="msg-edit-btn" data-message-id="${msg.id}" data-content="${escapeHtml(msg.content).replace(/"/g, '&quot;')}" style="display: block; width: 100%; padding: 8px 16px; background: none; border: none; color: white; text-align: left; cursor: pointer; font-size: 14px;">✏️ Редактировать</button>
                                <button class="msg-delete-btn" data-message-id="${msg.id}" style="display: block; width: 100%; padding: 8px 16px; background: none; border: none; color: #EF4444; text-align: left; cursor: pointer; font-size: 14px;">🗑️ Удалить</button>
                            </div>
                        ` : ''}
                        <div style="font-size: 11px; margin-bottom: 4px; color: #C084FC;">${escapeHtml(msg.profiles?.username)}</div>
                        <div class="message-content" style="word-break: break-word; white-space: normal; line-height: 1.4;">${escapeHtml(msg.content)}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; gap: 8px;">
                            <div style="font-size: 10px; color: #A1A1AA;">${new Date(msg.created_at).toLocaleTimeString()}</div>
                            ${msg.edited_at ? `<div style="font-size: 10px; color: #A1A1AA;">(изменено)</div>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Добавляем обработчики для меню сообщений
            messagesDiv.querySelectorAll('.message-menu-btn').forEach(btn => {
                btn.removeEventListener('click', handleMenuClick);
                btn.addEventListener('click', handleMenuClick);
            });
            
            messagesDiv.querySelectorAll('.msg-edit-btn').forEach(btn => {
                btn.removeEventListener('click', handleEditClick);
                btn.addEventListener('click', handleEditClick);
            });
            
            messagesDiv.querySelectorAll('.msg-delete-btn').forEach(btn => {
                btn.removeEventListener('click', handleDeleteClick);
                btn.addEventListener('click', handleDeleteClick);
            });
            
            if (wasAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function handleMenuClick(e) {
    e.stopPropagation();
    const btn = e.target;
    const msgDiv = btn.closest('.message');
    const msgId = msgDiv.dataset.messageId;
    const menu = document.getElementById(`msg-menu-${msgId}`);
    document.querySelectorAll('.message-menu-dropdown').forEach(m => {
        if (m.id !== `msg-menu-${msgId}`) m.style.display = 'none';
    });
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

async function handleEditClick(e) {
    e.stopPropagation();
    const btn = e.target;
    const messageId = btn.dataset.messageId;
    const oldContent = btn.dataset.content;
    const newContent = prompt('Редактировать сообщение:', oldContent);
    if (newContent && newContent.trim() && newContent !== oldContent) {
        try {
            await chatsAPI.updateMessage(state.currentChat, messageId, newContent);
            await loadMessages();
            showToast('✅ Сообщение обновлено', 'success');
        } catch (error) {
            showToast('Ошибка редактирования', 'error');
        }
    }
    const menu = document.getElementById(`msg-menu-${messageId}`);
    if (menu) menu.style.display = 'none';
}

async function handleDeleteClick(e) {
    e.stopPropagation();
    const btn = e.target;
    const messageId = btn.dataset.messageId;
    if (confirm('Удалить сообщение?')) {
        try {
            await chatsAPI.deleteMessage(state.currentChat, messageId);
            await loadMessages();
            showToast('✅ Сообщение удалено', 'success');
        } catch (error) {
            showToast('Ошибка удаления', 'error');
        }
    }
    const menu = document.getElementById(`msg-menu-${messageId}`);
    if (menu) menu.style.display = 'none';
}

export async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input?.value;
    if (!content?.trim() || !state.currentChat) return;
    
    try {
        await chatsAPI.sendMessage(state.currentChat, content);
        if (input) input.value = '';
        await loadMessages();
        await renderChats(document.getElementById('chatsList'));
    } catch (error) {
        showToast('Ошибка отправки сообщения', 'error');
    }
}

export function closeChat() {
    setState({ currentChat: null, currentChatUser: null });
    const chatsCard = document.getElementById('chatsListCard');
    const chatWindow = document.getElementById('chatWindow');
    if (chatsCard) chatsCard.style.display = 'block';
    if (chatWindow) chatWindow.style.display = 'none';
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    renderChats(document.getElementById('chatsList'));
}

export function viewChatUserProfile() {
    if (state.currentChatUser) {
        closeChat();
        viewUserProfile(state.currentChatUser.id);
    }
}

export function showChatMenu() {
    showToast('🚧 Функция в разработке', 'info');
}

// Закрываем меню при клике вне
document.addEventListener('click', () => {
    document.querySelectorAll('.message-menu-dropdown').forEach(menu => {
        menu.style.display = 'none';
    });
});