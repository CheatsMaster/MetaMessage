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
        } else if (pageName === 'settings') {
            await renderSettings(document.getElementById('settingsContainer'));
        }
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
    try {
        const data = await authAPI.me();
        setState({ currentUser: data });
        document.getElementById('userName').textContent = data.profile?.username || data.user.email.split('@')[0];
        await renderFeed(document.getElementById('postsFeed'));
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        window.location.href = '/login.html';
    }
}

document.addEventListener('DOMContentLoaded', init);