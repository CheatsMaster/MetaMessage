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
        .insert([{ post_id: postId, user_id: userId, created_at: new Date() }]);
      
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

router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;
  
  try {
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const postsWithStats = await Promise.all(posts.map(async (post) => {
      const { count: likesCount } = await supabaseAdmin
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      const { data: userLike } = await supabaseAdmin
        .from('post_likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
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
    res.status(500).json({ error: error.message });
  }
});

// Лайкнуть комментарий
router.post('/comments/:commentId/like', authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  
  try {
    const { data: existingLike } = await supabaseAdmin
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingLike) {
      await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);
      
      await supabaseAdmin
        .from('post_comments')
        .update({ likes_count: supabaseAdmin.sql`likes_count - 1` })
        .eq('id', commentId);
      
      res.json({ liked: false });
    } else {
      await supabaseAdmin
        .from('comment_likes')
        .insert([{ comment_id: commentId, user_id: userId }]);
      
      await supabaseAdmin
        .from('post_comments')
        .update({ likes_count: supabaseAdmin.sql`likes_count + 1` })
        .eq('id', commentId);
      
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить список лайкнувших пост
router.get('/:postId/likes', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('post_likes')
      .select(`
        user_id,
        created_at,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Редактировать пост
router.put('/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Содержание поста не может быть пустым' });
  }
  
  try {
    // Проверяем, что пост принадлежит пользователю
    const { data: post, error: findError } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();
    
    if (findError) throw findError;
    
    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'Вы не можете редактировать этот пост' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({ 
        content: content.trim(),
        edited_at: new Date()
      })
      .eq('id', postId)
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить пост
router.delete('/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверяем, что пост принадлежит пользователю
    const { data: post, error: findError } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();
    
    if (findError) throw findError;
    
    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'Вы не можете удалить этот пост' });
    }
    
    // Удаляем сначала лайки и комментарии (каскадно)
    await supabaseAdmin.from('post_likes').delete().eq('post_id', postId);
    await supabaseAdmin.from('post_comments').delete().eq('post_id', postId);
    
    // Удаляем пост
    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId);
    
    if (error) throw error;
    
    res.json({ message: 'Пост удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;