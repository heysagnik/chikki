import { callBackendApi } from './backend-api.js';

// Access environment variables
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
const baseUrl = apiUrl || 'http://localhost:3000';

console.log(`Using API key: ${apiKey ? 'Exists' : 'MISSING'} and API URL: ${baseUrl}`);

// API Endpoints
const LOGIN_ENDPOINT = '/api/auth/login';
const REGISTER_ENDPOINT = '/api/auth/register';
const PROFILE_ENDPOINT = '/api/auth/me';
const HEALTH_ENDPOINT = '/';

// Handles login and registration requests
async function handleAuthRequest(endpoint, data) {
    try {
        console.log(`[ServiceWorker] Auth request to ${endpoint}:`, data);
        const currentApiKey = process.env.API_KEY || '';

        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': currentApiKey
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        console.log(`[ServiceWorker] Raw backend response for ${endpoint}:`, responseData);

        if (!response.ok) {
            console.error(`[ServiceWorker] Backend request failed for ${endpoint}: Status ${response.status}`, responseData);
            return {
                success: false,
                error: responseData.message || `Request failed with status ${response.status}`
            };
        }

        // --- ADJUSTED EXTRACTION ---
        const token = responseData.data?.token;
        const user = responseData.data?.user; // Extract user from nested 'data' object

        console.log(`[ServiceWorker] Extracted token: ${token ? 'Exists' : 'MISSING'}, Extracted user: ${user ? 'Exists' : 'MISSING'}`);

        if (!token || !user) {
             console.error(`[ServiceWorker] Backend response for ${endpoint} is missing token or user under 'data'. Response:`, JSON.stringify(responseData));
             return { success: false, error: 'Backend response missing token or user data.' };
        }

        // --- SAVE THE EXTRACTED USER OBJECT ---
        const dataToSave = { authToken: token, user: user };
        console.log(`[ServiceWorker] Attempting to save to storage for ${endpoint}:`, JSON.stringify(dataToSave));
        try {
            await chrome.storage.local.set(dataToSave);
            console.log(`[ServiceWorker] Successfully saved auth data to storage for ${endpoint}.`);
            const verificationData = await chrome.storage.local.get(['authToken', 'user']);
            console.log('[ServiceWorker] Verification read after save:', JSON.stringify(verificationData));
        } catch (storageError) {
            console.error(`[ServiceWorker] Failed to save auth data to storage for ${endpoint}:`, storageError);
            return { success: false, error: 'Failed to save session data.' };
        }

        const resultToSend = { success: true, token: token, user: user };
        console.log(`[ServiceWorker] Sending result back to popup for ${endpoint}:`, JSON.stringify(resultToSend));
        return resultToSend;

    } catch (error) {
        console.error(`[ServiceWorker] Auth request to ${endpoint} failed:`, error);
        return {
            success: false,
            error: error.message || 'Network error occurred'
        };
    }
}

// Fetches the health status of the backend API
async function fetchApiHealth() {
    console.log('[ServiceWorker] Fetching API health...');
    try {
        const response = await fetch(`${baseUrl}${HEALTH_ENDPOINT}`);
        const data = await response.json();

        if (!response.ok || !data.status) { // Assuming health endpoint returns { status: "..." }
             throw new Error(data.message || `Health check failed (${response.status})`);
        }

        const status = data.status.toLowerCase();
        let healthState = 'warning'; // Default to warning for unknown statuses
        if (status === 'ready to assist' || status.includes('operational')) {
            healthState = 'online';
        } else if (status.includes('degrad') || status.includes('maintenance')) {
            healthState = 'warning';
        } else {
             healthState = 'offline';
        }
        console.log('[ServiceWorker] API Health status:', healthState);
        return { success: true, health: healthState };

    } catch (error) {
        console.error('[ServiceWorker] Health check error:', error);
        return { success: false, health: 'offline', error: error.message };
    }
}

// Fetches the user profile using the stored auth token
async function fetchUserProfile() {
    console.log('[ServiceWorker] Fetching user profile...');
    try {
        const storageData = await chrome.storage.local.get('authToken');
        const token = storageData.authToken;

        if (!token) {
            console.log('[ServiceWorker] No auth token found for profile fetch.');
            return { success: false, error: 'Not authenticated', requiresLogout: true };
        }

        const response = await fetch(`${baseUrl}${PROFILE_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-Key': apiKey,
                'Accept': 'application/json'
            }
        });

        const responseData = await response.json(); // Use responseData for consistency
        console.log('[ServiceWorker] Raw profile response:', responseData);


        if (!response.ok) {
            console.error('[ServiceWorker] Profile fetch failed:', response.status, responseData);
            if (response.status === 401 || response.status === 403) {
                await chrome.storage.local.remove(['authToken', 'user']);
                console.log('[ServiceWorker] Cleared invalid token due to 401/403.');
                return { success: false, error: 'Session expired or invalid', requiresLogout: true };
            }
            throw new Error(responseData.message || `Failed to fetch profile (${response.status})`);
        }

        // --- ADJUSTED EXTRACTION ---
        const user = responseData.data?.user; // Extract user from nested 'data' object

        if (!user) {
             console.error('[ServiceWorker] Profile response missing user data under "data.user". Response:', JSON.stringify(responseData));
             // Decide if this requires logout or is just a data error
             return { success: false, error: 'Invalid profile data received', requiresLogout: false };
        }

        // --- SAVE THE EXTRACTED USER OBJECT ---
        await chrome.storage.local.set({ user: user });
        console.log('[ServiceWorker] Successfully fetched and updated user profile in storage.');
        return { success: true, user: user }; // Send back the extracted user object

    } catch (error) {
        console.error('[ServiceWorker] Profile fetch error:', error);
        return { success: false, error: error.message || 'Failed to fetch profile', requiresLogout: false };
    }
}

// Main message listener for requests from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[ServiceWorker] Received message:', message.action || message.type, message.data || '');

    switch (message.action || message.type) {
        case 'generate':
            callBackendApi(message.prompt)
                .then(data => sendResponse({ data }))
                .catch(error => sendResponse({ error: error.message }));
            return true; // Indicate async response

        case 'login':
            handleAuthRequest(LOGIN_ENDPOINT, message.data)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Indicate async response

        case 'register':
            handleAuthRequest(REGISTER_ENDPOINT, message.data)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Indicate async response

        case 'getHealth':
            fetchApiHealth()
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, health: 'offline', error: error.message }));
            return true; // Indicate async response

        case 'getProfile':
            fetchUserProfile()
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message, requiresLogout: false }));
            return true; // Indicate async response

        default:
            console.warn('[ServiceWorker] Unknown message action:', message.action || message.type);
            // Optionally send a response for unknown actions
            // sendResponse({ success: false, error: "Unknown action" });
            return false; // No async response intended
    }
});

console.log("Chikki service worker initialized/updated");