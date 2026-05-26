// Глобальное состояние приложения
export const state = {
    currentUser: null,
    currentChat: null,
    currentChatUser: null,
    viewedUser: null,
    refreshInterval: null,
    unreadCount: 0,
    activePage: 'feed'
};

export let listeners = [];

export function subscribe(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

export function setState(newState) {
    Object.assign(state, newState);
    listeners.forEach(listener => listener(state));
}

export function getState() {
    return state;
}