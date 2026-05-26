import { state, setState } from './state.js';
import { authAPI } from './api.js';
import { renderFeed } from './components/feed.js';
import { renderMyProfile, viewUserProfile } from './components/profile.js';
import { renderChats, startChat, openChat, closeChat, sendMessage, showChatMenu, viewChatUserProfile } from './components/chats.js';
import { renderSearch } from './components/search.js';
import { renderSettings } from './components/settings.js';

// Делаем глобальные функции для onclick
window.viewUserProfile = viewUserProfile;
window.startChat = startChat;
window.openChat = openChat;
window.closeChat = closeChat;
window.sendMessage = sendMessage;
window.showChatMenu = showChatMenu;
window.viewChatUserProfile = viewChatUserProfile;

window.searchUsers = async () => {
    const query = document.getElementById('searchInput').value;
    const container = document.getElementById('searchResults');
    await renderSearch(container, query);
};

window.switchPage = async (pageName) => {
    const feedPage = document.getElementById('feedPage');
    const chatsPage = document.getElementById('chatsPage');
    const searchPage = document.getElementById('searchPage');
    const profilePage = document.getElementById('profilePage');
    const settingsPage = document.getElementById('settingsPage');
    
    const pages = [feedPage, chatsPage, searchPage, profilePage, settingsPage];
    pages.forEach(p => {
        if (p) p.classList.remove('active');
    });
    
    const activePage = document.getElementById(`${pageName}Page`);
    if (activePage) activePage.classList.add('active');
    
    // Меняем активную вкладку в навигации
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.classList.remove('active');
        const tabPage = tab.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
        if (tabPage === pageName) {
            tab.classList.add('active');
        }
    });
    
    setState({ activePage: pageName });
    
    try {
        if (pageName === 'feed') {
            await renderFeed(document.getElementById('postsFeed'));
        } else if (pageName === 'chats') {
            if (window.closeChat) window.closeChat();
            await renderChats(document.getElementById('chatsList'));
        } else if (pageName === 'search') {
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
        } else if (pageName === 'profile') {
            await renderMyProfile(document.getElementById('myProfileContainer'));
        }
        // Убираем settings из switchPage - настройки теперь только через профиль
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
    }
};

window.logout = async () => {
    if (state.refreshInterval) clearInterval(state.refreshInterval);
    await authAPI.logout();
    window.location.href = '/login.html';
};

window.createPost = async () => {
    const content = document.getElementById('postContent').value;
    if (!content.trim()) return;
    const { postsAPI } = await import('./api.js');
    await postsAPI.create(content);
    document.getElementById('postContent').value = '';
    await renderFeed(document.getElementById('postsFeed'));
};

window.openSettings = () => {
    window.switchPage('settings');
};

async function init() {
    console.log('🔍 1. Проверка авторизации...');
    console.log('🔍 2. Текущий URL:', window.location.href);
    
    try {
        console.log('🔍 3. Отправляем запрос /api/auth/me...');
        const data = await authAPI.me();
        console.log('✅ 4. Пользователь авторизован:', data);
        console.log('✅ 5. Данные профиля:', data.profile);
        
        setState({ currentUser: data });
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = data.profile?.username || data.user.email.split('@')[0];
        }
        
        console.log('🔍 6. Загружаем ленту...');
        await renderFeed(document.getElementById('postsFeed'));
        console.log('✅ 7. Инициализация завершена успешно!');
        
    } catch (error) {
        console.error('❌ ОШИБКА авторизации:', error);
        console.error('❌ Детали ошибки:', error.message);
        console.error('❌ Полный объект ошибки:', error);
        
        // Временно убираем редирект, чтобы увидеть ошибку
        // window.location.href = '/login.html';
        
        // Показываем ошибку на странице
        const feedContainer = document.getElementById('postsFeed');
        if (feedContainer) {
            feedContainer.innerHTML = `<div class="card" style="text-align: center; color: #EF4444;">
                <h3>❌ Ошибка авторизации</h3>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="window.location.href='/login.html'">Перейти на страницу входа</button>
            </div>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', init);