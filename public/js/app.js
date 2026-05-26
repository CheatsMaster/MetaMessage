import { state, setState } from './state.js';
import { authAPI } from './api.js';
import { renderFeed } from './components/feed.js';
import { renderProfile, renderMyProfile } from './components/profile.js';
import { renderChats } from './components/chats.js';
import { renderSearch } from './components/search.js';
import { renderSettings } from './components/settings.js';
import { showToast } from './utils.js';

// Делаем глобальные функции для onclick
window.viewUserProfile = (userId) => {
    import('./components/profile.js').then(module => {
        module.viewUserProfile(userId);
    });
};

window.switchPage = async (pageName) => {
    const feedPage = document.getElementById('feedPage');
    const chatsPage = document.getElementById('chatsPage');
    const searchPage = document.getElementById('searchPage');
    const profilePage = document.getElementById('profilePage');
    const settingsPage = document.getElementById('settingsPage');
    
    // Скрываем все
    [feedPage, chatsPage, searchPage, profilePage, settingsPage].forEach(p => {
        if (p) p.classList.remove('active');
    });
    
    // Показываем нужную
    const activePage = document.getElementById(`${pageName}Page`);
    if (activePage) activePage.classList.add('active');
    
    setState({ activePage: pageName });
    
    // Загружаем данные
    const containerMap = {
        feed: () => renderFeed(document.getElementById('postsFeed')),
        chats: () => renderChats(document.getElementById('chatsList')),
        search: () => renderSearch(document.getElementById('searchResults')),
        profile: () => renderMyProfile(document.getElementById('myProfileContainer')),
        settings: () => renderSettings(document.getElementById('settingsContainer'))
    };
    
    if (containerMap[pageName]) {
        await containerMap[pageName]();
    }
};

window.logout = async () => {
    if (state.refreshInterval) clearInterval(state.refreshInterval);
    await authAPI.logout();
    window.location.href = '/login.html';
};

// Инициализация
async function init() {
    try {
        const data = await authAPI.me();
        setState({ currentUser: data });
        document.getElementById('userName').textContent = data.profile?.username || data.user.email.split('@')[0];
        
        // Загружаем ленту по умолчанию
        await renderFeed(document.getElementById('postsFeed'));
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        window.location.href = '/login.html';
    }
}

document.addEventListener('DOMContentLoaded', init);