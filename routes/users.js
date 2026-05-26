import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить всех пользователей (для поиска новых чатов)
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, status, avatar_url');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;