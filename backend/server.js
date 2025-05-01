require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// --- Configuration & Validation ---
const apiKey = process.env.GEMINI_API_KEY;
const geminiEndpoint = process.env.GEMINI_API_ENDPOINT;
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];

if (!apiKey || !geminiEndpoint) {
    console.error("FATAL ERROR: GEMINI_API_KEY and GEMINI_API_ENDPOINT environment variables are required.");
    process.exit(1);
}

if (isProduction && allowedOrigins.length === 0) {
    console.warn("WARNING: Production environment detected but CORS_ALLOWED_ORIGINS is not set. This is insecure.");
    // Consider exiting in a strict production setup: process.exit(1);
}

// --- Middleware ---

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        if (!isProduction || (origin && allowedOrigins.includes(origin)) || !origin) {
            // Allow requests in dev, from allowed origins in prod, or server-to-server requests (no origin)
            callback(null, true);
        } else {
            console.error(`CORS: Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,POST',
    credentials: true,
};
app.use(cors(corsOptions));

// Nonce Generation for CSP
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('hex');
    next();
});

// Helmet Security Headers & CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", geminiEndpoint],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null, // Use upgradeInsecureRequests in production if behind HTTPS proxy
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true, // Consider submitting domain for HSTS preload list
    },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    xFrameOptions: { action: 'deny' },
    xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
    xXssProtection: true,
}));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // Requests per window per IP
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
});
app.use('/api', apiLimiter);

// Request Body Parsing
app.use(express.json({ limit: '500kb' }));

// --- API Routes ---

app.post('/api/generate', async (req, res) => {
    const { prompt, generationConfig } = req.body;
    const MAX_PROMPT_LENGTH = 15000; // Increased limit slightly

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
        return res.status(400).json({ success: false, error: `Invalid or missing "prompt" (max length: ${MAX_PROMPT_LENGTH}).` });
    }

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        ...(generationConfig && typeof generationConfig === 'object' && !Array.isArray(generationConfig) && { generationConfig }),
    };

    const url = `${geminiEndpoint}?key=${apiKey}`;
    const logPrefix = `[${new Date().toISOString()}]`;

    console.log(`${logPrefix} Calling Gemini API (Prompt Start): "${prompt.substring(0, 50)}..."`);

    try {
        const geminiResponse = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 45000, // Increased timeout slightly
        });

        const generatedText = geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof generatedText !== 'string') {
            console.warn(`${logPrefix} Gemini response missing expected text structure. Status: ${geminiResponse.status}`, geminiResponse.data);
            return res.status(502).json({ success: false, error: 'Received invalid response structure from AI service.' });
        }

        console.log(`${logPrefix} Gemini API Success (Response Start): "${generatedText.substring(0, 50)}..."`);
        res.json({ success: true, data: generatedText.trim() });

    } catch (error) {
        let status = 500;
        let clientMessage = 'An error occurred while processing your request.';
        let logMessage = error.message || 'Unknown error';

        if (axios.isAxiosError(error)) {
            logMessage = `Axios Error: ${error.message}`;
            if (error.response) {
                status = error.response.status || 502;
                logMessage += ` | Status: ${status} | Data: ${JSON.stringify(error.response.data)}`;
                if (status === 400) clientMessage = 'Invalid request sent to AI service.';
                else if (status === 429) clientMessage = 'AI service rate limit exceeded. Please try again later.';
                else if (status >= 500) clientMessage = 'The AI service is currently unavailable. Please try again later.';
                else clientMessage = `AI service returned status ${status}.`;
            } else if (error.request) {
                status = 504; // Gateway Timeout
                logMessage += ' | No response received from AI service.';
                clientMessage = 'No response received from the AI service (timeout). Please try again later.';
            } else {
                 logMessage += ' | Error setting up Axios request.';
            }
        }

        console.error(`${logPrefix} Error calling Gemini API: ${logMessage}`);
        res.status(status).json({ success: false, error: clientMessage });
    }
});

// --- Health Check Route ---

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

app.get('/', (req, res) => {
    const status = {
        service: 'Chikki AI Backend',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        version: '0.0.1-alpha',
        uptime: formatUptime(process.uptime()),
        timestamp: new Date().toISOString()
    };

    const acceptsHtml = req.headers.accept?.includes('text/html');

    if (acceptsHtml) {
        const nonce = res.locals.nonce;
        // Simple HTML for status page, using nonce for inline styles
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${status.service} - Status</title>
            <style nonce="${nonce}">
            :root { --bg: #f9fafb; --card-bg: #ffffff; --text: #1f2937; --text-secondary: #6b7280; --border: #e5e7eb; --success: #10b981; }
            body { font-family: system-ui, sans-serif; background-color: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; margin: 0; }
            .container { max-width: 800px; margin: auto; background-color: var(--card-bg); border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); padding: 2rem; border: 1px solid var(--border); }
            h1 { font-size: 1.875rem; font-weight: 600; margin-bottom: 0.5rem; }
            .status-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.1); color: var(--success); font-size: 0.875rem; font-weight: 500; margin-bottom: 1.5rem; }
            .status-badge::before { content: ""; display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background-color: var(--success); margin-right: 0.5rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
            .card { padding: 1rem; background-color: var(--bg); border-radius: 0.5rem; border: 1px solid var(--border); }
            .card-title { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
            .card-value { font-weight: 600; font-size: 1.125rem; word-break: break-all; }
            .timestamp { margin-top: 2rem; font-size: 0.875rem; color: var(--text-secondary); text-align: right; }
            .uptime-viz { margin-top: 1.5rem; }
            .uptime-viz-title { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
            .uptime-hours { display: flex; flex-wrap: wrap; gap: 0.25rem; }
            .hour-line { height: 0.5rem; background-color: var(--success); border-radius: 2px; flex: 1 1 25px; min-width: 25px; }
            .hour-label { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.75rem; margin-top: 0.25rem; }
            </style>
        </head>
        <body>
            <div class="container">
            <h1>${status.service}</h1>
            <div class="status-badge">${status.status.toUpperCase()}</div>
            <div class="grid">
                <div class="card"><div class="card-title">Environment</div><div class="card-value">${status.environment}</div></div>
                <div class="card"><div class="card-title">Version</div><div class="card-value">${status.version}</div></div>
                <div class="card"><div class="card-title">Uptime</div><div class="card-value">${status.uptime}</div></div>
            </div>
            
            <div class="uptime-viz">
                <div class="uptime-viz-title">Uptime Visualization (each bar = 1 hour)</div>
                <div class="uptime-hours">
                ${(() => {
                    // Parse uptime string
                    const uptimeString = status.uptime;
                    const days = parseInt(uptimeString.match(/(\d+)d/)?.[1] || 0);
                    const hours = parseInt(uptimeString.match(/(\d+)h/)?.[1] || 0);
                    const totalHours = days * 24 + hours;
                    
                    // Generate hour bars (max 48 for visual clarity)
                    const displayHours = Math.min(totalHours, 48);
                    let hourBars = '';
                    for (let i = 0; i < displayHours; i++) {
                    hourBars += '<div class="hour-line"></div>';
                    }
                    return hourBars || '<div style="color: var(--text-secondary);">Less than 1 hour</div>';
                })()}
                </div>
                <div class="hour-label">
                <span>0h</span>
                <span>${(() => {
                    const uptimeString = status.uptime;
                    const days = parseInt(uptimeString.match(/(\d+)d/)?.[1] || 0);
                    const hours = parseInt(uptimeString.match(/(\d+)h/)?.[1] || 0);
                    const totalHours = days * 24 + hours;
                    return Math.min(totalHours, 48) + 'h';
                })()}</span>
                </div>
            </div>
            
            <div class="timestamp">Timestamp: ${new Date(status.timestamp).toLocaleString()}</div>
            </div>
        </body>
        </html>`;
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } else {
        res.status(200).json(status);
    }
});

// --- Error Handling ---

// 404 Handler (Not Found)
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled Error: ${err.message}`, err.stack || '');

    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.status || 500;
    let errorMessage = 'An unexpected server error occurred.';

    if (err.message === 'Not allowed by CORS') {
        statusCode = 403;
        errorMessage = 'Access forbidden by CORS policy.';
    } else if (!isProduction && err.message) {
        // Provide more detail in non-production environments
        errorMessage = err.message;
    }

    res.status(statusCode).json({
        success: false,
        error: errorMessage
    });
});

// --- Server Start ---

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
        if (isProduction) {
            console.log(`CORS Allowed Origins: ${allowedOrigins.join(', ') || 'NONE (Strict)'}`);
        } else {
            console.log("CORS: Allowing all origins in development mode.");
        }
    }).on('error', (err) => {
        console.error('FATAL ERROR: Server failed to start:', err);
        process.exit(1);
    });
}

module.exports = app; // Export for testing