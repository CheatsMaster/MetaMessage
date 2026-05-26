import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Поиск пользователей
router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .ilike('username', `%${q}%`)
      .or(`full_name.ilike.%${q}%`)
      .neq('id', req.user.id)
      .limit(20);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить друзей
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        friend_id,
        profiles:friend_id (id, username, full_name, avatar_url, status)
      `)
      .eq('user_id', req.user.id)
      .eq('status', 'accepted');
    
    if (error) throw error;
    res.json(data.map(f => f.profiles));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить заявку в друзья
router.post('/request/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { error } = await supabaseAdmin
      .from('friendships')
      .insert([{
        user_id: req.user.id,
        friend_id: userId,
        status: 'pending'
      }]);
    
    if (error) throw error;
    res.json({ message: 'Заявка отправлена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Принять заявку
router.post('/accept/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  
  try {
    const { error } = await supabaseAdmin
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .eq('friend_id', req.user.id);
    
    if (error) throw error;
    res.json({ message: 'Друг добавлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;