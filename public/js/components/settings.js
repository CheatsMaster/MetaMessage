import { state, setState } from '../state.js';
import { usersAPI, authAPI } from '../api.js';
import { escapeHtml, showToast } from '../utils.js';
import { renderMyProfile } from './profile.js';

let currentSettingsTab = 'account';
let settingsHistory = [];

export async function renderSettings(container) {
    if (!container) return;
    
    settingsHistory = [];
    await renderSettingsPage(container, 'main');
}

async function renderSettingsPage(container, page, data = {}) {
    if (page === 'main') {
        container.innerHTML = `
            <div class="settings-main">
                <div class="settings-nav">
                    <div class="settings-nav-item" onclick="window.openSettingsPage('account')">👤 Аккаунт</div>
                    <div class="settings-nav-item" onclick="window.openSettingsPage('security')">🔒 Безопасность</div>
                    <div class="settings-nav-item" onclick="window.openSettingsPage('other')">📦 Прочее</div>
                </div>
            </div>
        `;
    } 
    else if (page === 'account') {
        container.innerHTML = `
            <div class="settings-page">
                <button class="back-btn-settings" onclick="window.goBackSettings()">← Назад</button>
                <h3 style="margin-bottom: 24px; margin-top: 16px;">👤 Настройки аккаунта</h3>
                <div class="settings-form">
                    <div class="input-group">
                        <label>Имя пользователя</label>
                        <input type="text" id="settingsUsername" class="settings-input" value="${escapeHtml(state.currentUser?.profile?.username || '')}">
                    </div>
                    <div class="input-group">
                        <label>Полное имя</label>
                        <input type="text" id="settingsFullName" class="settings-input" value="${escapeHtml(state.currentUser?.profile?.full_name || '')}">
                    </div>
                    <div class="input-group">
                        <label>Email</label>
                        <input type="email" id="settingsEmail" class="settings-input" value="${escapeHtml(state.currentUser?.user?.email || '')}" disabled style="opacity: 0.6;">
                    </div>
                    <div class="input-group">
                        <label>Дата рождения</label>
                        <input type="date" id="settingsBirthDate" class="settings-input" value="${state.currentUser?.profile?.birth_date || ''}">
                    </div>
                    <div class="input-group">
                        <label>О себе</label>
                        <textarea id="settingsBio" rows="4" class="settings-input">${escapeHtml(state.currentUser?.profile?.bio || '')}</textarea>
                    </div>
                    <button class="btn-primary" onclick="window.saveProfileSettings()">💾 Сохранить изменения</button>
                </div>
            </div>
        `;
    } 
    else if (page === 'security') {
        container.innerHTML = `
            <div class="settings-page">
                <button class="back-btn-settings" onclick="window.goBackSettings()">← Назад</button>
                <h3 style="margin-bottom: 24px; margin-top: 16px;">🔒 Безопасность</h3>
                <div class="settings-form">
                    <div class="input-group">
                        <label>Текущий пароль</label>
                        <input type="password" id="currentPassword" class="settings-input" placeholder="Введите текущий пароль">
                    </div>
                    <div class="input-group">
                        <label>Новый пароль</label>
                        <input type="password" id="newPassword" class="settings-input" placeholder="Минимум 6 символов">
                    </div>
                    <div class="input-group">
                        <label>Подтверждение пароля</label>
                        <input type="password" id="confirmPassword" class="settings-input" placeholder="Повторите новый пароль">
                    </div>
                    <button class="btn-primary" onclick="window.changePassword()">🔄 Сменить пароль</button>
                </div>
            </div>
        `;
    } 
    else if (page === 'other') {
        container.innerHTML = `
            <div class="settings-page">
                <button class="back-btn-settings" onclick="window.goBackSettings()">← Назад</button>
                <h3 style="margin-bottom: 24px; margin-top: 16px;">📦 Дополнительные настройки</h3>
                <div style="text-align: center; padding: 40px; color: #A1A1AA;">
                    ⚙️ Раздел в разработке<br>
                    Здесь появятся дополнительные настройки
                </div>
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn-secondary" onclick="window.logout()" style="background: rgba(239,68,68,0.1); color: #FCA5A5;">🚪 Выйти из аккаунта</button>
                </div>
            </div>
        `;
    }
}

window.openSettingsPage = async (page) => {
    settingsHistory.push(currentSettingsTab);
    currentSettingsTab = page;
    const container = document.getElementById('settingsContainer');
    await renderSettingsPage(container, page);
};

window.goBackSettings = async () => {
    const previous = settingsHistory.pop();
    if (previous) {
        currentSettingsTab = previous;
        const container = document.getElementById('settingsContainer');
        await renderSettingsPage(container, 'main');
    } else {
        window.switchPage('profile');
    }
};

window.saveProfileSettings = async () => {
    const birthDate = document.getElementById('settingsBirthDate')?.value;
    console.log('📅 Сохраняем дату рождения:', birthDate);
    
    const data = {
        username: document.getElementById('settingsUsername')?.value,
        full_name: document.getElementById('settingsFullName')?.value,
        bio: document.getElementById('settingsBio')?.value,
        birth_date: birthDate || null
    };
    
    console.log('📤 Отправляем данные:', data);
    
    try {
        await usersAPI.updateProfile(data);
        const me = await authAPI.me();
        console.log('✅ Получен обновленный профиль:', me);
        setState({ currentUser: me });
        showToast('✅ Профиль успешно обновлен!', 'success');
        await renderMyProfile(document.getElementById('myProfileContainer'));
        window.goBackSettings();
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        showToast('❌ Ошибка сохранения: ' + error.message, 'error');
    }
};

window.changePassword = async () => {
    showToast('🔧 Функция смены пароля в разработке', 'info');
};