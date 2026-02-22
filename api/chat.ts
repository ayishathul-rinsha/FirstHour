export default async function handler(req: any, res: any) {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Credentials', 'true');
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
        const max_tokens = body.max_tokens || 3000;
        const response_format = body.response_format;
        const model = body.model || 'llama-3.3-70b-versatile';

        const apiKey = process.env['GROQ_API_KEY'];

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

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
                response_format
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Groq API returned an error:', data);
            return res.status(response.status).json(data);
        }

        console.log('Groq API success!');
        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Internal Proxy Exception:', error.stack || error.message);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
