const API_CONFIG = {
    BASE_URL: process.env.API_URL || 'https://chikki-backend.vercel.app',
    ENDPOINT: '/api/generate',
    API_KEY: process.env.API_KEY || 'fallback-key',
    TIMEOUT_MS: 10000,
    MAX_RETRIES: 2,
};

export async function callBackendApi(prompt, generationConfig = null) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        throw new Error("Prompt cannot be empty");
    }

    const requestId = crypto.randomUUID();
    const requestPayload = {
        prompt,
        ...(generationConfig && { generationConfig })
    };

    let retries = 0;
    
    while (retries <= API_CONFIG.MAX_RETRIES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
            
            // Set up headers including authentication if provided
            const headers = {
                'Content-Type': 'application/json',
                'X-API-Key': API_CONFIG.API_KEY,
                'X-Request-ID': requestId
            };
            
            // Add auth token to headers if provided
            if (generationConfig?.authToken) {
                headers['Authorization'] = `Bearer ${generationConfig.authToken}`;
            }
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINT}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.status === 401 || response.status === 403) {
                throw new Error("Unauthorized: Please log in again");
            }
            
            if (response.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data?.error || `API Error (${response.status}): ${response.statusText}`);
            }
            
            if (!data.success || typeof data.data !== 'string') {
                throw new Error("Invalid response format");
            }
            
            return data.data;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error("Request timed out");
            }
            
            if (error.message.includes('fetch') && retries < API_CONFIG.MAX_RETRIES) {
                retries++;
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                continue;
            }
            
            console.error(`Request ${requestId} failed:`, error);
            throw error;
        }
    }
}

export async function checkBackendStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/`, {
            method: 'GET',
            headers: {
                'X-API-Key': API_CONFIG.API_KEY
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
