import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить ленту постов
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (postsError) throw postsError;
    
    const postsWithStats = await Promise.all(posts.map(async (post) => {
      const { count: likesCount } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      const { data: userLike } = await supabaseAdmin
        .from('post_likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', userId)
        .maybeSingle();
      
      const { count: commentsCount } = await supabaseAdmin
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      return {
        ...post,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        liked_by_user: !!userLike
      };
    }));
    
    res.json(postsWithStats);
  } catch (error) {
    console.error('Ошибка загрузки ленты:', error);
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
    const { data: existingLike } = await supabaseAdmin
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingLike) {
      await supabaseAdmin
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      
      res.json({ liked: false });
    } else {
      await supabaseAdmin
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);
      
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
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('post_comments')
      .insert([{
        post_id: postId,
        user_id: req.user.id,
        content: content.trim()
      }])
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить комментарии к посту
router.get('/:postId/comments', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('post_comments')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;