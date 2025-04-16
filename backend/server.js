// server.js
require('dotenv').config(); // Load environment variables from .env file first
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

// --- Environment Variable Checks ---
const apiKey = process.env.GEMINI_API_KEY;
const geminiEndpoint = process.env.GEMINI_API_ENDPOINT;

if (!apiKey || !geminiEndpoint) {
    console.error("FATAL ERROR: Required environment variables are missing.");
    process.exit(1);
}

// --- Middleware ---

// Enable CORS - Configure appropriately for production
app.use(cors()); // Use default CORS settings for now (allows all origins)

app.use(helmet()); // Set various security HTTP headers
app.use(express.json()); // Parse JSON request bodies

// Basic Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter); // Apply rate limiting to all /api routes

// --- API Route ---
app.post('/api/generate', async (req, res) => {
    const { prompt, generationConfig } = req.body; // Expect 'prompt' and optional 'generationConfig' in request body

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Invalid or missing "prompt" in request body.' });
    }

    // Structure the request body for the Gemini API
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        ...(generationConfig && { generationConfig }) // Include generationConfig if provided
    };

    const url = `${geminiEndpoint}?key=${apiKey}`;

    console.log(`Received request. Calling Gemini for prompt (first 50 chars): "${prompt.substring(0, 50)}..."`);

    try {
        const geminiResponse = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // --- Extract the generated text ---
        const generatedText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.warn("Gemini response missing expected text structure:", geminiResponse.data);
            return res.status(500).json({ success: false, error: 'Failed to extract text from Gemini response.' });
        }

        console.log(`Successfully generated response (first 50 chars): "${generatedText.substring(0, 50)}..."`);
        res.json({ success: true, data: generatedText.trim() });

    } catch (error) {
        console.error('Error calling Gemini API:', error.response?.data || error.message);

        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to get response from AI service.'
        });
    }
});

// --- Basic Root Route ---
app.get('/', (req, res) => {
    res.send('AI Writing Assistant Backend is running.');
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`AI Writing Assistant backend server listening on http://localhost:${port}`);
});