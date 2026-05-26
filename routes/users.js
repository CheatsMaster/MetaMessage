import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить всех пользователей
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, avatar_url, status, bio');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Получить профиль пользователя по ID
router.get('/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, website, status, created_at, birth_date')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить свой профиль
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, full_name, bio, website, avatar_url, birth_date } = req.body;
  const userId = req.user.id;
  
  try {
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (full_name !== undefined) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (website !== undefined) updates.website = website;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (birth_date !== undefined) updates.birth_date = birth_date;
    updates.updated_at = new Date();
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;