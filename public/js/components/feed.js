import { state } from '../state.js';
import { postsAPI } from '../api.js';
import { escapeHtml, formatDate, showToast } from '../utils.js';
import { viewUserProfile } from './profile.js';

let commentsOpen = {};

export async function renderFeed(container) {
    try {
        const posts = await postsAPI.feed();
        container.innerHTML = posts.map(post => renderPost(post)).join('');
        
        // Привязываем обработчики
        container.querySelectorAll('.post-stat-like').forEach(btn => {
            btn.addEventListener('click', () => toggleLike(btn.dataset.postId));
        });
        container.querySelectorAll('.post-stat-comment').forEach(btn => {
            btn.addEventListener('click', () => toggleComments(btn.dataset.postId));
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
            <div class="post-content" onclick="window.openPostModal('${post.id}')" style="cursor: pointer;">${escapeHtml(post.content)}</div>
            <div class="post-stats">
                <div class="post-stat post-stat-like ${post.liked_by_user ? 'active' : ''}" data-post-id="${post.id}">
                    ❤️ <span class="likes-count">${post.likes_count || 0}</span>
                </div>
                <div class="post-stat post-stat-comment" data-post-id="${post.id}">
                    💬 <span class="comments-count">${post.comments_count || 0}</span>
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
        // Обновляем ленту или просто меняем состояние
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
        
        if (comments.length === 0) {
            container.innerHTML = '<div style="color: #A1A1AA; text-align: center; padding: 20px;">Нет комментариев. Будьте первым!</div>';
        } else {
            container.innerHTML = comments.map(comment => renderComment(comment)).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
    }
}

function renderComment(comment, level = 0) {
    return `
        <div class="comment" style="margin-left: ${level * 20}px;">
            <div class="comment-avatar" onclick="window.viewUserProfile('${comment.user_id}')" style="cursor: pointer;">${(comment.profiles?.username?.[0] || 'U').toUpperCase()}</div>
            <div style="flex: 1;">
                <div class="comment-author" onclick="window.viewUserProfile('${comment.user_id}')" style="cursor: pointer;">${escapeHtml(comment.profiles?.username || 'Пользователь')}</div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button class="comment-like-btn" data-comment-id="${comment.id}" onclick="window.likeComment('${comment.id}')" style="background: none; border: none; color: #A1A1AA; cursor: pointer; font-size: 12px;">❤️ ${comment.likes_count || 0}</button>
                    <button class="comment-reply-btn" onclick="window.showReplyInput('${comment.id}', '${comment.id}')" style="background: none; border: none; color: #A1A1AA; cursor: pointer; font-size: 12px;">↩️ Ответить</button>
                </div>
                <div id="replies-${comment.id}"></div>
            </div>
        </div>
    `;
}

window.addComment = async (postId) => {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value;
    if (!content.trim()) return;
    
    try {
        await postsAPI.addComment(postId, content);
        input.value = '';
        await loadComments(postId);
        // Обновляем счётчик
        const post = document.querySelector(`.post[data-post-id="${postId}"]`);
        const commentsSpan = post.querySelector('.comments-count');
        commentsSpan.textContent = parseInt(commentsSpan.textContent) + 1;
    } catch (error) {
        showToast('Ошибка отправки комментария', 'error');
    }
};

window.likeComment = async (commentId) => {
    try {
        await postsAPI.likeComment(commentId);
        showToast('❤️ Лайк поставлен', 'success');
    } catch (error) {
        showToast('Ошибка', 'error');
    }
};

window.showReplyInput = (commentId, parentId) => {
    const container = document.getElementById(`replies-${commentId}`);
    if (container.querySelector('.reply-input-container')) {
        container.querySelector('.reply-input-container').remove();
        return;
    }
    const replyHtml = `
        <div class="reply-input-container" style="margin-top: 8px;">
            <div class="comment-input" style="margin-top: 0;">
                <input type="text" id="reply-input-${commentId}" placeholder="Написать ответ...">
                <button class="btn-secondary" onclick="window.submitReply('${commentId}', '${parentId}')">Ответить</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', replyHtml);
};

window.submitReply = async (commentId, parentId) => {
    const input = document.getElementById(`reply-input-${commentId}`);
    const content = input.value;
    if (!content.trim()) return;
    
    // TODO: реализовать API для ответов на комментарии
    showToast('Функция в разработке', 'info');
    input.value = '';
};

window.openPostModal = (postId) => {
    showToast(`Пост ${postId} - модальное окно в разработке`, 'info');
};