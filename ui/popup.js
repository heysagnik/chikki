// ui/popup.js

// --- Auth State ---
let authState = {
    isLoggedIn: false,
    user: null,
    token: null // Still useful to have locally for quick checks if needed, though SW is source of truth
};

// --- DOM Elements ---
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const healthStatusDot = document.getElementById('health-status-dot');
const healthStatusText = document.getElementById('health-status-text');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const userPlan = document.getElementById('user-plan');
const statusMessage = document.getElementById('status-message');

// --- UI Functions ---

/**
 * Display a status message to the user.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'warning'|'error'|'loading'} type - The type of message.
 */
function setStatus(message, type = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;

    // Auto-hide non-error/loading messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (statusMessage.textContent === message) {
                statusMessage.textContent = '';
                statusMessage.className = 'status';
            }
        }, 5000);
    }
}

function showAuthSection() {
    if (authSection) authSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');

    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerName) registerName.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';

    switchTab('login');
}

function showDashboard() {
    if (authSection) authSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    updateDashboardUI();
}

function updateDashboardUI() {
    if (!authState.isLoggedIn || !authState.user) {
        if (userName) userName.textContent = '...';
        if (userEmail) userEmail.textContent = '...';
        if (userPlan) userPlan.textContent = '...';
        return;
    }
    // Access user properties directly from authState.user
    if (userName) userName.textContent = authState.user.name || 'N/A';
    if (userEmail) userEmail.textContent = authState.user.email || 'N/A';
    // Determine plan based on email_verified status
    if (userPlan) userPlan.textContent = authState.user.email_verified ? 'Verified' : 'Free'; // Or adjust logic as needed
}

function updateHealthUI(healthStatus) {
    if (!healthStatusText || !healthStatusDot) return;

    switch (healthStatus) {
        case 'online':
            healthStatusText.textContent = 'Online';
            healthStatusDot.className = 'status-dot online';
            break;
        case 'warning':
            healthStatusText.textContent = 'Degraded';
            healthStatusDot.className = 'status-dot warning';
            break;
        case 'offline':
        default:
            healthStatusText.textContent = 'Offline';
            healthStatusDot.className = 'status-dot offline';
            break;
    }
}

function switchTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    const showLogin = tabName === 'login';
    if (loginForm) loginForm.classList.toggle('active', showLogin);
    if (registerForm) registerForm.classList.toggle('active', !showLogin);

    setStatus('');
}

// --- Auth Functions ---

async function checkAuthState() {
    try {
        console.log('[checkAuthState] Reading from storage...');
        const authData = await chrome.storage.local.get(['authToken', 'user']);
        console.log('[checkAuthState] Data read from storage:', JSON.stringify(authData));

        if (authData && authData.authToken && typeof authData.authToken === 'string' && authData.user && typeof authData.user === 'object') {
            console.log(`[checkAuthState] Token and user found. Setting state.`);
            authState.token = authData.authToken;
            authState.user = authData.user;
            authState.isLoggedIn = true;

            showDashboard();

            console.log('[checkAuthState] Requesting health and profile updates from Service Worker...');
            requestApiHealth();
            requestUserProfile();

        } else {
            console.log(`[checkAuthState] Condition failed. Calling handleLogout(false).`);
            handleLogout(false);
        }
    } catch (error) {
        console.error('[checkAuthState] Error:', error);
        setStatus('Error loading extension state.', 'error');
        showAuthSection();
    }
}

async function handleLogin() {
    if (!loginEmail || !loginPassword) return;
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) return setStatus('Please enter both email and password', 'warning');
    setStatus('Logging in...', 'loading');
    if (loginBtn) loginBtn.disabled = true;

    try {
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'login', data: { email, password } },
                response => {
                    if (chrome.runtime.lastError) {
                        return reject(new Error(chrome.runtime.lastError.message || 'Communication error'));
                    }
                    if (!response) {
                        return reject(new Error('No response from service worker'));
                    }
                    resolve(response);
                }
            );
        });

        console.log('Response from service worker for login:', result);

        if (!result.success || !result.token || !result.user) {
            throw new Error(result.error || 'Login failed. Invalid response.');
        }

        authState.token = result.token;
        authState.user = result.user;
        authState.isLoggedIn = true;

        setStatus('Login successful!', 'success');
        showDashboard();
        requestApiHealth();

    } catch (error) {
        console.error('Login error:', error);
        setStatus(`Login failed: ${error.message}`, 'error');
        showAuthSection();
    } finally {
        if (loginBtn) loginBtn.disabled = false;
    }
}

async function handleRegister() {
    if (!registerName || !registerEmail || !registerPassword) return;
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    if (!name || !email || !password) return setStatus('Please fill in all fields', 'warning');
    if (!/\S+@\S+\.\S+/.test(email)) return setStatus('Please enter a valid email address', 'warning');
    if (password.length < 6) return setStatus('Password must be at least 6 characters', 'warning');
    setStatus('Creating account...', 'loading');
    if (registerBtn) registerBtn.disabled = true;

    try {
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: 'register', data: { name, email, password } },
                response => {
                    if (chrome.runtime.lastError) {
                        return reject(new Error(chrome.runtime.lastError.message || 'Communication error'));
                    }
                    if (!response) {
                        return reject(new Error('No response from service worker'));
                    }
                    resolve(response);
                }
            );
        });

        console.log('Response from service worker for register:', result);

        if (!result.success || !result.token || !result.user) {
            throw new Error(result.error || 'Registration failed. Invalid response.');
        }

        authState.token = result.token;
        authState.user = result.user;
        authState.isLoggedIn = true;

        setStatus('Account created successfully!', 'success');
        showDashboard();
        requestApiHealth();

    } catch (error) {
        console.error('Register error:', error);
        setStatus(`Registration failed: ${error.message}`, 'error');
        switchTab('register');
    } finally {
        if (registerBtn) registerBtn.disabled = false;
    }
}

function handleLogout(showMessage = true) {
    console.log('[handleLogout] Logging out...');
    const wasLoggedIn = authState.isLoggedIn;
    authState = { token: null, user: null, isLoggedIn: false };
    chrome.storage.local.remove(['authToken', 'user'], () => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing auth token from storage:", chrome.runtime.lastError);
        }
        console.log('[handleLogout] Storage cleared.');
        showAuthSection();
        if (showMessage && wasLoggedIn) {
            setStatus('You have been logged out', 'info');
        }
    });
    updateDashboardUI();
    updateHealthUI('offline');
}

// --- Functions to Request Data from Service Worker ---

async function requestApiHealth() {
    console.log('[Popup] Sending getHealth request to Service Worker...');
    if (!healthStatusText || !healthStatusDot) return;

    healthStatusText.textContent = 'Checking...';
    healthStatusDot.className = 'status-dot';

    try {
        const response = await chrome.runtime.sendMessage({ action: 'getHealth' });
        console.log('[Popup] Response from getHealth:', response);

        if (response && response.success) {
            updateHealthUI(response.health);
        } else {
            console.error('Failed to get health status:', response?.error);
            updateHealthUI('offline');
        }
    } catch (error) {
        console.error('Error sending getHealth message:', error);
        updateHealthUI('offline');
    }
}

async function requestUserProfile() {
    console.log('[Popup] Sending getProfile request to Service Worker...');
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getProfile' });
        console.log('[Popup] Response from getProfile:', response);

        if (response) {
            if (response.success && response.user) {
                authState.user = response.user;
                authState.isLoggedIn = true;
                updateDashboardUI();
                console.log('[Popup] User profile updated.');
            } else {
                console.error('Failed to get user profile:', response.error);
                if (response.requiresLogout) {
                    console.log('[Popup] Profile fetch indicated logout required.');
                    setStatus('Session expired. Please log in again.', 'warning');
                    handleLogout(false);
                } else {
                    if (userName) userName.textContent = 'Error';
                    if (userEmail) userEmail.textContent = 'Could not load';
                    setStatus('Failed to refresh profile data', 'error');
                }
            }
        } else {
            console.error('No response received for getProfile request.');
            setStatus('Failed to refresh profile data', 'error');
        }
    } catch (error) {
        console.error('Error sending getProfile message:', error);
        setStatus('Failed to refresh profile data', 'error');
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();

    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                switchTab(button.getAttribute('data-tab'));
            });
        });
    }
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', () => handleLogout(true));
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
    }
    if (registerPassword) {
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleRegister(); }
        });
    }
});