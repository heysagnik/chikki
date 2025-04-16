const BACKEND_API_ENDPOINT = 'http://localhost:3000/api/generate';

export async function callBackendApi(prompt, generationConfig = null) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        throw new Error("Prompt cannot be empty.");
    }

    const requestPayload = {
        prompt,
        ...(generationConfig && { generationConfig })
    };

    try {
        const response = await fetch(BACKEND_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Add authentication headers if required
            },
            body: JSON.stringify(requestPayload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            const errorMessage = data?.error || `Backend API Error: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }

        if (typeof data.data !== 'string') {
            throw new Error("Invalid data format received from backend.");
        }

        return data.data;
    } catch (error) {
        throw new Error(`Failed to connect to AI backend: ${error.message}`);
    }
}