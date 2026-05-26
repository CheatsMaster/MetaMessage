import { state } from '../state.js';
import { postsAPI } from '../api.js';
import { escapeHtml, formatDate, showToast } from '../utils.js';
import { viewUserProfile } from './profile.js';

let commentsOpen = {};

export async function renderFeed(container) {
    try {
        const posts = await postsAPI.feed();
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center;">Нет постов. Напишите первый!</div>';
            return;
        }
        container.innerHTML = posts.map(post => renderPost(post)).join('');
        
        container.querySelectorAll('.post-stat-like').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(btn.dataset.postId);
            });
        });
        container.querySelectorAll('.post-stat-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleComments(btn.dataset.postId);
            });
        });
        container.querySelectorAll('.post-stat-likes').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showLikesModal(btn.dataset.postId);
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки ленты:', error);
        container.innerHTML = '<div class="card">Ошибка загрузки постов</div>';
    }
}

function renderPost(post) {
    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar" onclick="window.viewUserProfile('${post.user_id}')" style="cursor: pointer;">${(post.profiles?.username?.[0] || 'U').toUpperCase()}</div>
                <div>
                    <div class="post-author" onclick="window.viewUserProfile('${post.user_id}')" style="cursor: pointer;">${escapeHtml(post.profiles?.username || 'Пользователь')}</div>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-stats">
                <div class="post-stat post-stat-like ${post.liked_by_user ? 'active' : ''}" data-post-id="${post.id}">
                    ❤️ <span class="likes-count">${post.likes_count || 0}</span>
                </div>
                <div class="post-stat post-stat-comment" data-post-id="${post.id}">
                    💬 <span class="comments-count">${post.comments_count || 0}</span>
                </div>
                <div class="post-stat post-stat-likes" data-post-id="${post.id}" style="cursor: pointer; margin-left: auto;">
                    👥
                </div>
            </div>
            <div class="post-menu" style="position: relative; margin-left: auto;">
                <button class="post-menu-btn" data-post-id="${post.id}" style="background: none; border: none; color: #A1A1AA; cursor: pointer; font-size: 18px;">⋮</button>
                <div class="post-menu-dropdown" id="post-menu-${post.id}" style="display: none; position: absolute; right: 0; background: #2A2A2A; border-radius: 12px; padding: 8px 0; min-width: 150px; z-index: 10;">
                    <button class="post-menu-item" onclick="window.editPost('${post.id}')" style="display: block; width: 100%; padding: 8px 16px; background: none; border: none; color: white; text-align: left; cursor: pointer;">✏️ Редактировать</button>
                    <button class="post-menu-item" onclick="window.deletePost('${post.id}')" style="display: block; width: 100%; padding: 8px 16px; background: none; border: none; color: #EF4444; text-align: left; cursor: pointer;">🗑️ Удалить</button>
                </div>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div id="comments-list-${post.id}"></div>
                <div class="comment-input">
                    <input type="text" id="comment-input-${post.id}" placeholder="Написать комментарий...">
                    <button class="btn-secondary" onclick="window.addComment('${post.id}')">Отправить</button>
                </div>
            </div>
        </div>
    `;
}

async function toggleLike(postId) {
    try {
        await postsAPI.like(postId);
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        const likeBtn = post.querySelector('.post-stat-like');
        const likesSpan = likeBtn.querySelector('.likes-count');
        const currentLikes = parseInt(likesSpan.textContent);
        
        if (likeBtn.classList.contains('active')) {
            likeBtn.classList.remove('active');
            likesSpan.textContent = currentLikes - 1;
        } else {
            likeBtn.classList.add('active');
            likesSpan.textContent = currentLikes + 1;
        }
    } catch (error) {
        showToast('Ошибка', 'error');
    }
}

async function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
        await loadComments(postId);
    } else {
        commentsDiv.style.display = 'none';
    }
}

async function loadComments(postId) {
    try {
        const comments = await postsAPI.getComments(postId);
        const container = document.getElementById(`comments-list-${postId}`);
        
        if (!comments || comments.length === 0) {
            container.innerHTML = '<div style="color: #A1A1AA; text-align: center; padding: 20px;">Нет комментариев. Будьте первым!</div>';
        } else {
            container.innerHTML = comments.map(comment => renderComment(comment, postId)).join('');
        }
        
        container.querySelectorAll('.comment-like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                likeComment(btn.dataset.commentId);
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
    }
}

function renderComment(comment, postId) {
    const replyInputId = `reply-input-${comment.id}`;
    const repliesContainerId = `replies-${comment.id}`;
    
    return `
        <div class="comment" data-comment-id="${comment.id}" style="margin-bottom: 16px;">
            <div class="comment-avatar" onclick="window.viewUserProfile('${comment.user_id}')" style="cursor: pointer;">${(comment.profiles?.username?.[0] || 'U').toUpperCase()}</div>
            <div style="flex: 1;">
                <div class="comment-author" onclick="window.viewUserProfile('${comment.user_id}')" style="cursor: pointer;">${escapeHtml(comment.profiles?.username || 'Пользователь')}</div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                <div style="display: flex; gap: 16px; margin-top: 8px;">
                    <button class="comment-like-btn" data-comment-id="${comment.id}" style="background: none; border: none; color: ${comment.liked_by_user ? '#EF4444' : '#A1A1AA'}; cursor: pointer; font-size: 12px;">❤️ ${comment.likes_count || 0}</button>
                    <button class="comment-reply-btn" onclick="window.showReplyInput('${comment.id}', '${postId}')" style="background: none; border: none; color: #A1A1AA; cursor: pointer; font-size: 12px;">↩️ Ответить</button>
                </div>
                <div id="${repliesContainerId}" style="margin-left: 40px; margin-top: 12px;"></div>
                <div id="${replyInputId}" style="display: none; margin-top: 12px;">
                    <div class="comment-input" style="margin-top: 0;">
                        <input type="text" placeholder="Написать ответ..." style="flex: 1;">
                        <button class="btn-secondary" onclick="window.submitReply('${comment.id}', '${postId}')">Ответить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function likeComment(commentId) {
    try {
        await postsAPI.likeComment(commentId);
        const btn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
        if (btn) {
            const currentLikes = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
            if (btn.style.color === 'rgb(239, 68, 68)') {
                btn.style.color = '#A1A1AA';
                btn.innerHTML = `❤️ ${currentLikes - 1}`;
            } else {
                btn.style.color = '#EF4444';
                btn.innerHTML = `❤️ ${currentLikes + 1}`;
            }
        }
    } catch (error) {
        showToast('Ошибка', 'error');
    }
}

window.addComment = async (postId) => {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value;
    if (!content.trim()) return;
    
    try {
        await postsAPI.addComment(postId, content);
        input.value = '';
        await loadComments(postId);
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        const commentsSpan = post.querySelector('.comments-count');
        commentsSpan.textContent = parseInt(commentsSpan.textContent) + 1;
    } catch (error) {
        showToast('Ошибка отправки комментария', 'error');
    }
};

window.showReplyInput = (commentId, postId) => {
    const replyDiv = document.getElementById(`reply-input-${commentId}`);
    if (replyDiv.style.display === 'none') {
        replyDiv.style.display = 'block';
    } else {
        replyDiv.style.display = 'none';
    }
};

window.submitReply = async (parentCommentId, postId) => {
    const replyDiv = document.getElementById(`reply-input-${parentCommentId}`);
    const input = replyDiv.querySelector('input');
    const content = input.value;
    if (!content.trim()) return;
    
    try {
        showToast('Функция ответов на комментарии в разработке', 'info');
        input.value = '';
        replyDiv.style.display = 'none';
    } catch (error) {
        showToast('Ошибка', 'error');
    }
};

async function showLikesModal(postId) {
    try {
        const likes = await postsAPI.getPostLikes(postId);
        const modal = document.getElementById('likesModal');
        const content = document.getElementById('likesModalContent');
        
        if (!likes || likes.length === 0) {
            content.innerHTML = '<div style="text-align: center; padding: 20px;">Нет лайков</div>';
        } else {
            content.innerHTML = likes.map(like => {
                // Форматируем дату правильно
                let dateStr = 'недавно';
                if (like.created_at) {
                    const date = new Date(like.created_at);
                    if (!isNaN(date.getTime())) {
                        dateStr = formatDate(like.created_at);
                    }
                }
                return `
                    <div class="user-card" style="margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px;" onclick="window.viewUserProfile('${like.user_id}'); document.getElementById('likesModal').classList.remove('active');">
                        <div class="user-avatar" style="width: 40px; height: 40px;">${(like.profiles?.username?.[0] || 'U').toUpperCase()}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${escapeHtml(like.profiles?.username)}</div>
                            <div style="font-size: 12px; color: #A1A1AA;">${escapeHtml(like.profiles?.full_name || '')}</div>
                        </div>
                        <div style="font-size: 11px; color: #A1A1AA;">${dateStr}</div>
                    </div>
                `;
            }).join('');
        }
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Ошибка загрузки списка лайков:', error);
        showToast('Ошибка загрузки списка лайков', 'error');
    }
}

window.editPost = async (postId) => {
    const post = document.querySelector(`.post[data-post-id="${postId}"]`);
    const contentDiv = post.querySelector('.post-content');
    const oldContent = contentDiv.textContent;
    
    const newContent = prompt('Редактировать пост:', oldContent);
    if (newContent && newContent.trim() && newContent !== oldContent) {
        try {
            await postsAPI.update(postId, newContent);
            contentDiv.textContent = newContent;
            showToast('✅ Пост обновлен', 'success');
        } catch (error) {
            showToast('Ошибка редактирования', 'error');
        }
    }
};

window.deletePost = async (postId) => {
    if (confirm('Удалить пост?')) {
        try {
            await postsAPI.delete(postId);
            document.querySelector(`.post[data-post-id="${postId}"]`).remove();
            showToast('✅ Пост удален', 'success');
        } catch (error) {
            showToast('Ошибка удаления', 'error');
        }
    }
};

// Обработчики меню
document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('post-menu-btn')) {
        document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// В renderPost добавить обработчик для кнопки меню (после рендера)
// Или добавить глобальный обработчик
setTimeout(() => {
    document.querySelectorAll('.post-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            const menu = document.getElementById(`post-menu-${postId}`);
            document.querySelectorAll('.post-menu-dropdown').forEach(m => {
                if (m.id !== `post-menu-${postId}`) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });
    });
}, 100);

window.closeLikesModal = () => {
    document.getElementById('likesModal').classList.remove('active');
};