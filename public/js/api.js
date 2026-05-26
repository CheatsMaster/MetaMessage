const API_URL = '';

export async function apiFetch(endpoint, options = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка запроса');
    }
    return res.json();
}

export const authAPI = {
    me: () => apiFetch('/api/auth/me'),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' })
};

export const postsAPI = {
    feed: () => apiFetch('/api/posts/feed'),
    create: (content, userId = null) => apiFetch('/api/posts', { 
        method: 'POST', 
        body: JSON.stringify(userId ? { content, user_id: userId } : { content }) 
    }),
    like: (postId) => apiFetch(`/api/posts/${postId}/like`, { method: 'POST' }),
    getComments: (postId) => apiFetch(`/api/posts/${postId}/comments`),
    addComment: (postId, content) => apiFetch(`/api/posts/${postId}/comments`, { 
        method: 'POST', 
        body: JSON.stringify({ content }) 
    }),
    getUserPosts: (userId) => apiFetch(`/api/posts/user/${userId}`)
};

export const chatsAPI = {
    getChats: () => apiFetch('/api/chats'),
    getOrCreatePrivate: (userId) => apiFetch(`/api/chats/private/${userId}`, { method: 'POST' }),
    getMessages: (chatId) => apiFetch(`/api/chats/${chatId}/messages`),
    sendMessage: (chatId, content) => apiFetch(`/api/chats/${chatId}/messages`, { 
        method: 'POST', 
        body: JSON.stringify({ content }) 
    }),
    getParticipants: (chatId) => apiFetch(`/api/chats/${chatId}/participants`)
};

export const usersAPI = {
    getProfile: (userId) => apiFetch(`/api/users/${userId}`),
    updateProfile: (data) => apiFetch('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
    search: (query) => apiFetch(`/api/friends/search?q=${encodeURIComponent(query)}`),
    getFriends: () => apiFetch('/api/friends')
};