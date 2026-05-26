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
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    updatePassword: (oldPassword, newPassword) => apiFetch('/api/auth/change-password', { 
        method: 'POST', 
        body: JSON.stringify({ oldPassword, newPassword }) 
    })
};

export const postsAPI = {
    feed: () => apiFetch('/api/posts/feed'),
    create: (content, userId = null) => apiFetch('/api/posts', { 
        method: 'POST', 
        body: JSON.stringify(userId ? { content, user_id: userId } : { content }) 
    }),
    like: (postId) => apiFetch(`/api/posts/${postId}/like`, { method: 'POST' }),
    getComments: (postId) => apiFetch(`/api/posts/${postId}/comments`),
    addComment: (postId, content, parentId = null) => apiFetch(`/api/posts/${postId}/comments`, { 
        method: 'POST', 
        body: JSON.stringify({ content, parent_id: parentId }) 
    }),
    likeComment: (commentId) => apiFetch(`/api/comments/${commentId}/like`, { method: 'POST' }),
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
    getParticipants: (chatId) => apiFetch(`/api/chats/${chatId}/participants`),
    clearChat: (chatId) => apiFetch(`/api/chats/${chatId}/clear`, { method: 'POST' }),
    blockUser: (userId) => apiFetch(`/api/chats/block/${userId}`, { method: 'POST' })
};

export const usersAPI = {
    getProfile: (userId) => apiFetch(`/api/users/${userId}`),
    updateProfile: (data) => apiFetch('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
    search: (query) => apiFetch(`/api/friends/search?q=${encodeURIComponent(query)}`),
    sendFriendRequest: (userId) => apiFetch(`/api/friends/request/${userId}`, { method: 'POST' }),
    acceptFriendRequest: (requestId) => apiFetch(`/api/friends/accept/${requestId}`, { method: 'POST' }),
    getFriends: () => apiFetch('/api/friends'),
    getFriendRequests: () => apiFetch('/api/friends/requests')
};

export const notificationsAPI = {
    get: () => apiFetch('/api/notifications'),
    markAsRead: (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => apiFetch('/api/notifications/read-all', { method: 'POST' })
};