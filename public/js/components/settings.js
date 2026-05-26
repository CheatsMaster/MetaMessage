import { state, setState } from '../state.js';
import { usersAPI } from '../api.js';
import { escapeHtml, showToast } from '../utils.js';
import { renderMyProfile } from './profile.js';

let currentSettingsTab = 'account';

export async function renderSettings(container) {
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <div style="flex: 0 0 200px;">
                <div style="background: rgba(36, 36, 36, 0.8); border-radius: 24px; padding: 16px;">
                    <div class="settings-nav">
                        <div class="settings-nav-item ${currentSettingsTab === 'account' ? 'active' : ''}" onclick="window.switchSettingsTab('account')">👤 Аккаунт</div>
                        <div class="settings-nav-item ${currentSettingsTab === 'other' ? 'active' : ''}" onclick="window.switchSettingsTab('other')">📦 Прочее</div>
                    </div>
                </div>
            </div>
            <div style="flex: 1;">
                <div class="card" id="settingsContent"></div>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .settings-nav-item {
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            color: #A1A1AA;
        }
        .settings-nav-item:hover {
            background: rgba(124, 58, 237, 0.1);
            color: #C084FC;
        }
        .settings-nav-item.active {
            background: #7C3AED;
            color: white;
        }
        .settings-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px;
            color: white;
            margin-bottom: 16px;
            font-family: inherit;
        }
        .settings-input:focus {
            outline: none;
            border-color: #7C3AED;
        }
        .input-group label {
            display: block;
            color: #A1A1AA;
            margin-bottom: 8px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    
    await switchSettingsTab(currentSettingsTab);
}

window.switchSettingsTab = async (tab) => {
    currentSettingsTab = tab;
    const items = document.querySelectorAll('.settings-nav-item');
    items.forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(tab === 'account' ? 'Аккаунт' : 'Прочее')) {
            item.classList.add('active');
        }
    });
    
    const container = document.getElementById('settingsContent');
    
    if (tab === 'account') {
        container.innerHTML = `
            <h3 style="margin-bottom: 24px;">👤 Настройки аккаунта</h3>
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
        `;
    } else if (tab === 'other') {
        container.innerHTML = `
            <h3 style="margin-bottom: 24px;">📦 Дополнительные настройки</h3>
            <div style="text-align: center; padding: 40px; color: #A1A1AA;">
                ⚙️ Раздел в разработке<br>
                Здесь появятся дополнительные настройки
            </div>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button class="btn-secondary" onclick="window.logout()" style="background: rgba(239,68,68,0.1); color: #FCA5A5;">🚪 Выйти из аккаунта</button>
            </div>
        `;
    }
};

window.saveProfileSettings = async () => {
    const data = {
        username: document.getElementById('settingsUsername')?.value,
        full_name: document.getElementById('settingsFullName')?.value,
        bio: document.getElementById('settingsBio')?.value,
        birth_date: document.getElementById('settingsBirthDate')?.value
    };
    
    try {
        await usersAPI.updateProfile(data);
        const { authAPI } = await import('../api.js');
        const me = await authAPI.me();
        setState({ currentUser: me });
        showToast('✅ Профиль успешно обновлен!', 'success');
        await renderMyProfile(document.getElementById('myProfileContainer'));
    } catch (error) {
        showToast('❌ Ошибка сохранения', 'error');
    }
};