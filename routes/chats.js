import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Получить список чатов пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId);
    
    if (participantsError) throw participantsError;
    
    if (!participants || participants.length === 0) {
      return res.json([]);
    }
    
    const chatIds = participants.map(p => p.chat_id);
    
    const { data: chats, error: chatsError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .in('id', chatIds);
    
    if (chatsError) throw chatsError;
    
    const chatsWithMessages = await Promise.all(chats.map(async (chat) => {
      const { data: lastMessage, error: messageError } = await supabaseAdmin
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          profiles:sender_id (id, username, avatar_url)
        `)
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let chatName = chat.name;
      if (chat.is_private && !chatName) {
        const { data: otherParticipants } = await supabaseAdmin
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chat.id)
          .neq('user_id', userId);
        
        if (otherParticipants && otherParticipants.length > 0) {
          const { data: otherUser } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', otherParticipants[0].user_id)
            .single();
          
          chatName = otherUser?.username || 'Личный чат';
        }
      }
      
      return {
        id: chat.id,
        name: chatName || 'Чат',
        is_private: chat.is_private,
        created_at: chat.created_at,
        last_message: lastMessage || null,
        unread_count: 0
      };
    }));
    
    res.json(chatsWithMessages);
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать или получить личный чат с пользователем
router.post('/private/:userId', authenticateToken, async (req, res) => {
  const currentUserId = req.user.id;
  const { userId } = req.params;
  
  if (currentUserId === userId) {
    return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
  }
  
  try {
    const { data: existingChats, error: findError } = await supabaseAdmin
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUserId);
    
    if (findError) throw findError;
    
    let commonChat = null;
    
    if (existingChats && existingChats.length > 0) {
      const chatIds = existingChats.map(c => c.chat_id);
      
      const { data: otherParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)
        .in('chat_id', chatIds);
      
      if (otherParticipants && otherParticipants.length > 0) {
        commonChat = otherParticipants[0].chat_id;
      }
    }
    
    if (commonChat) {
      const { data: chat } = await supabaseAdmin
        .from('chats')
        .select('*')
        .eq('id', commonChat)
        .single();
      
      return res.json(chat);
    }
    
    const { data: newChat, error: chatError } = await supabaseAdmin
      .from('chats')
      .insert([{ is_private: true, name: null }])
      .select()
      .single();
    
    if (chatError) throw chatError;
    
    await supabaseAdmin
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: currentUserId },
        { chat_id: newChat.id, user_id: userId }
      ]);
    
    res.json(newChat);
  } catch (error) {
    console.error('Ошибка создания чата:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение
router.post('/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }
  
  try {
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (participantError || !participant) {
      return res.status(403).json({ error: 'Вы не участник этого чата' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: userId,
        content: content.trim()
      }])
      .select(`
        *,
        profiles:sender_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
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
        profiles:sender_id (id, username, avatar_url, full_name)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:chatId/participants', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_participants')
      .select(`
        user_id,
        profiles:user_id (id, username, avatar_url, full_name, status)
      `)
      .eq('chat_id', chatId);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Редактировать сообщение
router.put('/:chatId/messages/:messageId', authenticateToken, async (req, res) => {
  const { chatId, messageId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }
  
  try {
    // Проверяем, что сообщение принадлежит пользователю
    const { data: message, error: findError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();
    
    if (findError) throw findError;
    
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Вы не можете редактировать это сообщение' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ 
        content: content.trim(),
        edited_at: new Date()
      })
      .eq('id', messageId)
      .select(`
        *,
        profiles:sender_id (id, username, avatar_url, full_name)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить сообщение
router.delete('/:chatId/messages/:messageId', authenticateToken, async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверяем, что сообщение принадлежит пользователю
    const { data: message, error: findError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();
    
    if (findError) throw findError;
    
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Вы не можете удалить это сообщение' });
    }
    
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    res.json({ message: 'Сообщение удалено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;