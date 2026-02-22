const https = require('https');

module.exports = async function (req, res) {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        let body = req.body || {};
        if (typeof req.body === 'string') {
            try { body = JSON.parse(req.body); } catch (e) { }
        }

        const messages = body.messages || [];
        const temperature = body.temperature || 0.2;
        const max_tokens = body.max_tokens || 1000;
        const response_format = body.response_format;
        const model = body.model || 'llama-3.3-70b-versatile';

        const apiKey = process.env.GROQ_API_KEY;

        console.log('--- Incoming Proxy Request ---');
        console.log('Model:', model);
        console.log('Messages count:', messages.length);

        if (!apiKey) {
            console.error('ERROR: GROQ_API_KEY environment variable is missing on Vercel.');
            return res.status(500).json({
                error: 'GROQ_API_KEY is not configured.',
                instruction: 'Please add GROQ_API_KEY in your Vercel Project Settings -> Environment Variables.'
            });
        }

        console.log('Forwarding request to Groq API...');

        const requestData = JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens,
            response_format
        });

        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData)
            }
        };

        const groqReq = https.request(options, (groqRes) => {
            let data = '';

            groqRes.on('data', (chunk) => {
                data += chunk;
            });

            groqRes.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (groqRes.statusCode >= 200 && groqRes.statusCode < 300) {
                        console.log('Groq API success!');
                        return res.status(200).json(parsedData);
                    } else {
                        console.error('Groq API returned an error:', parsedData);
                        return res.status(groqRes.statusCode).json(parsedData);
                    }
                } catch (e) {
                    console.error('Failed to parse Groq response:', e);
                    return res.status(500).json({ error: 'Failed to parse Groq response', details: data });
                }
            });
        });

        groqReq.on('error', (e) => {
            console.error('Groq Request Error:', e);
            res.status(500).json({ error: 'Failed to communicate with Groq', details: e.message });
        });

        groqReq.write(requestData);
        groqReq.end();

    } catch (error) {
        console.error('Internal Proxy Exception:', error.stack || error.message);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
