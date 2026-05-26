import { usersAPI } from '../api.js';
import { escapeHtml } from '../utils.js';
import { viewUserProfile } from './profile.js';
import { startChat } from './chats.js';

export async function renderSearch(container, query = '') {
    if (query.length < 2) {
        container.innerHTML = '';
        return;
    }
    
    try {
        const users = await usersAPI.search(query);
        
        if (users.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">Пользователи не найдены</div>';
        } else {
            container.innerHTML = users.map(user => `
                <div class="user-card">
                    <div class="user-info" onclick="window.viewUserProfile('${user.id}')" style="cursor: pointer; flex: 1;">
                        <div class="user-avatar">${(user.username?.[0] || 'U').toUpperCase()}</div>
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(user.username)}</div>
                            <div style="font-size: 12px; color: #A1A1AA;">${escapeHtml(user.full_name || '')}</div>
                            <div style="font-size: 11px; color: #A1A1AA; margin-top: 4px;">${escapeHtml(user.bio?.substring(0, 50) || '')}</div>
                        </div>
                    </div>
                    <button class="btn-secondary" onclick="event.stopPropagation(); window.startChat('${user.id}')">💬 Написать</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка поиска:', error);
        container.innerHTML = '<div class="card" style="text-align: center;">Ошибка поиска</div>';
    }
}

window.searchUsers = async () => {
    const query = document.getElementById('searchInput').value;
    const container = document.getElementById('searchResults');
    await renderSearch(container, query);
};