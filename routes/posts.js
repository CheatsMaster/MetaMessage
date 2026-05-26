import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить ленту постов (с друзьями и свои)
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Получаем посты от пользователя и его друзей
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name),
        post_likes (user_id),
        post_comments (id, content, user_id, profiles:user_id (username))
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Добавляем флаг likedByCurrentUser
    const postsWithLikeInfo = data.map(post => ({
      ...post,
      liked_by_user: post.post_likes?.some(like => like.user_id === userId) || false,
      likes_count: post.post_likes?.length || 0,
      comments_count: post.post_comments?.length || 0
    }));
    
    res.json(postsWithLikeInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать пост
router.post('/', authenticateToken, async (req, res) => {
  const { content, image_url } = req.body;
  
  if (!content && !image_url) {
    return res.status(400).json({ error: 'Текст или изображение обязательны' });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert([{
        user_id: req.user.id,
        content: content || '',
        image_url: image_url || null
      }])
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ ...data, liked_by_user: false, likes_count: 0, comments_count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Лайкнуть/убрать лайк с поста
router.post('/:postId/like', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверяем, есть ли уже лайк
    const { data: existingLike } = await supabaseAdmin
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
    
    if (existingLike) {
      // Убираем лайк
      await supabaseAdmin
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      
      // Обновляем счетчик
      await supabaseAdmin.rpc('decrement_post_likes', { post_id: postId });
      
      res.json({ liked: false });
    } else {
      // Добавляем лайк
      await supabaseAdmin
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);
      
      // Обновляем счетчик
      await supabaseAdmin.rpc('increment_post_likes', { post_id: postId });
      
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавить комментарий
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('post_comments')
      .insert([{
        post_id: postId,
        user_id: req.user.id,
        content
      }])
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    // Обновляем счетчик комментариев
    await supabaseAdmin.rpc('increment_post_comments', { post_id: postId });
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;