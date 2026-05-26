import { state, setState } from '../state.js';
import { usersAPI, postsAPI, authAPI } from '../api.js';
import { escapeHtml, formatDate, showToast } from '../utils.js';
import { startChat } from './chats.js';

let currentProfileTab = 'posts';

export async function renderMyProfile(container) {
    if (!state.currentUser) return;
    
    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #7C3AED, #A78BFA); border-radius: 24px 24px 0 0; height: 200px; display: flex; align-items: flex-end; justify-content: flex-start; padding-left: 24px; padding-bottom: 20px;">
            <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #7C3AED, #A78BFA); border-radius: 50%; border: 4px solid #1A1A1A; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700;">${(state.currentUser?.profile?.username?.[0] || 'U').toUpperCase()}</div>
        </div>
        <div style="padding: 20px 24px 24px; background: rgba(36, 36, 36, 0.8); border-radius: 0 0 24px 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-size: 24px; font-weight: 700;">${escapeHtml(state.currentUser?.profile?.username || 'Пользователь')}</div>
                    <div style="color: #A1A1AA; font-size: 14px;">${escapeHtml(state.currentUser?.user?.email)}</div>
                </div>
                <button class="btn-secondary" onclick="window.openSettings()">⚙️ Настройки</button>
            </div>
            <div style="color: #A1A1AA; margin: 12px 0; line-height: 1.6;">${escapeHtml(state.currentUser?.profile?.bio || 'Расскажите о себе')}</div>
            <div style="color: #7C3AED; margin: 8px 0;">🎂 ${escapeHtml(state.currentUser?.profile?.birth_date || 'Дата не указана')}</div>
            <div style="display: flex; gap: 24px; margin: 16px 0; padding: 16px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: #7C3AED;" id="myPostsCount">0</div><div style="font-size: 12px; color: #A1A1AA;">записей</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: #7C3AED;" id="myFriendsCount">0</div><div style="font-size: 12px; color: #A1A1AA;">друзей</div></div>
            </div>
        </div>
        <div style="display: flex; gap: 8px; background: rgba(0, 0, 0, 0.3); padding: 4px; border-radius: 60px; margin: 24px 0;">
            <button class="profile-tab active" onclick="window.switchMyProfileTab('posts')">📝 Мои записи</button>
            <button class="profile-tab" onclick="window.switchMyProfileTab('friends')">👥 Друзья</button>
        </div>
        <div id="myProfileTabContent"></div>
    `;
    
    await loadMyPosts();
    await loadProfileStats();
}

async function loadMyPosts() {
    try {
        const posts = await postsAPI.getUserPosts(state.currentUser.user.id);
        const container = document.getElementById('myProfileTabContent');
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">У вас пока нет записей</div>';
        } else {
            container.innerHTML = posts.map(post => renderProfilePost(post)).join('');
        }
        const countEl = document.getElementById('myPostsCount');
        if (countEl) countEl.textContent = posts.length;
    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
    }
}

function renderProfilePost(post) {
    const isOwnPost = post.user_id === state.currentUser?.user?.id;
    return `
        <div class="post">
            <div class="post-header">
                <div class="post-avatar" onclick="window.viewUserProfile('${post.user_id}')" style="cursor: pointer;">${(post.profiles?.username?.[0] || 'U').toUpperCase()}</div>
                <div>
                    <div class="post-author" onclick="window.viewUserProfile('${post.user_id}')" style="cursor: pointer;">${escapeHtml(post.profiles?.username || 'Пользователь')}</div>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-stats">
                <div class="post-stat">❤️ ${post.likes_count || 0}</div>
                <div class="post-stat">💬 ${post.comments_count || 0}</div>
            </div>
        </div>
    `;
}

async function loadProfileStats() {
    try {
        const friends = await usersAPI.getFriends();
        const friendsCountEl = document.getElementById('myFriendsCount');
        if (friendsCountEl) friendsCountEl.textContent = friends.length;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

window.switchMyProfileTab = async (tab) => {
    currentProfileTab = tab;
    const tabs = document.querySelectorAll('#myProfileContainer .profile-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    if (tab === 'posts') {
        await loadMyPosts();
    } else if (tab === 'friends') {
        document.getElementById('myProfileTabContent').innerHTML = '<div class="card" style="text-align: center;">👥 Список друзей скоро появится...</div>';
    }
};

export async function viewUserProfile(userId) {
    try {
        const user = await usersAPI.getProfile(userId);
        setState({ viewedUser: user });
        const isOwnProfile = userId === state.currentUser?.user?.id;
        
        const modal = document.getElementById('userProfileModal');
        const content = document.getElementById('userProfileContent');
        
        content.innerHTML = `
            <div>
                <div style="background: linear-gradient(135deg, #7C3AED, #A78BFA); border-radius: 24px 24px 0 0; height: 200px; display: flex; align-items: flex-end; justify-content: flex-start; padding-left: 24px; padding-bottom: 20px;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #7C3AED, #A78BFA); border-radius: 50%; border: 4px solid #1A1A1A; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700;">${(user.username?.[0] || 'U').toUpperCase()}</div>
                </div>
                <div style="padding: 20px 24px 24px; background: rgba(36, 36, 36, 0.8); border-radius: 0 0 24px 24px;">
                    <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${escapeHtml(user.username || 'Пользователь')}</div>
                    <div style="color: #A1A1AA; margin: 12px 0; line-height: 1.6;">${escapeHtml(user.bio || 'Расскажите о себе')}</div>
                    ${user.birth_date ? `<div style="color: #7C3AED; margin: 8px 0;">🎂 ${escapeHtml(user.birth_date)}</div>` : '<div style="color: #A1A1AA; margin: 8px 0;">🎂 Дата не указана</div>'} 
                    <div style="display: flex; gap: 24px; margin: 16px 0; padding: 16px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: #7C3AED;" id="userPostsCount">0</div><div style="font-size: 12px; color: #A1A1AA;">записей</div></div>
                        <div style="text-align: center;"><div style="font-size: 18px; font-weight: 700; color: #7C3AED;" id="userFriendsCount">0</div><div style="font-size: 12px; color: #A1A1AA;">друзей</div></div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        ${!isOwnProfile ? `<button class="btn-primary" id="messageFromProfileBtn">💬 Сообщение</button>` : ''}
                    </div>
                </div>
            </div>
            <div id="userProfileTabContent" style="margin-top: 24px;"></div>
        `;
        
        await loadUserPosts(user.id);
        
        const msgBtn = document.getElementById('messageFromProfileBtn');
        if (msgBtn) {
            msgBtn.onclick = () => {
                modal.classList.remove('active');
                startChat(user.id);
            };
        }
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showToast('Не удалось загрузить профиль', 'error');
    }
}

async function loadUserPosts(userId) {
    try {
        const posts = await postsAPI.getUserPosts(userId);
        const container = document.getElementById('userProfileTabContent');
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">Нет записей на стене</div>';
        } else {
            container.innerHTML = posts.map(post => renderProfilePost(post)).join('');
        }
        const countEl = document.getElementById('userPostsCount');
        if (countEl) countEl.textContent = posts.length;
    } catch (error) {
        console.error('Ошибка загрузки постов пользователя:', error);
    }
}

window.closeUserProfile = () => {
    document.getElementById('userProfileModal').classList.remove('active');
    setState({ viewedUser: null });
};

window.openSettings = () => {
    window.switchPage('settings');
};