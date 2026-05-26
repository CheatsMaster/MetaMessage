import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить список чатов пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('chat_participants')
      .select(`
        chat_id,
        chats:chat_id (
          id,
          name,
          is_private,
          created_at,
          messages:messages (
            id,
            content,
            created_at,
            sender_id,
            profiles:sender_id (id, username, avatar_url)
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { foreignTable: 'chats.messages', ascending: false });
    
    if (error) throw error;
    
    // Форматируем чаты
    const chats = data.map(item => {
      const chat = item.chats;
      const lastMessage = chat.messages?.[0] || null;
      return {
        id: chat.id,
        name: chat.name,
        is_private: chat.is_private,
        created_at: chat.created_at,
        last_message: lastMessage,
        unread_count: 0 // TODO: реализовать непрочитанные
      };
    });
    
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать или получить личный чат с пользователем
router.post('/private/:userId', authenticateToken, async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;
  
  try {
    // Проверяем, существует ли уже чат между этими пользователями
    const { data: existingChat, error: findError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUserId)
      .in('chat_id', 
        supabaseAdmin
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', userId)
      );
    
    if (existingChat && existingChat.length > 0) {
      // Чат уже существует
      const { data: chat } = await supabaseAdmin
        .from('chats')
        .select('*')
        .eq('id', existingChat[0].chat_id)
        .single();
      
      return res.json(chat);
    }
    
    // Создаем новый чат
    const { data: newChat, error: chatError } = await supabaseAdmin
      .from('chats')
      .insert([{ is_private: true }])
      .select()
      .single();
    
    if (chatError) throw chatError;
    
    // Добавляем участников
    await supabaseAdmin
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: currentUserId },
        { chat_id: newChat.id, user_id: userId }
      ]);
    
    res.json(newChat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение
router.post('/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: userId,
        content
      }])
      .select(`
        *,
        profiles:sender_id (id, username, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить сообщения чата
router.get('/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        profiles:sender_id (id, username, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;