
export default async function handler(req, res) {
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

    const { messages, temperature, max_tokens, response_format, model } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    console.log('--- Incoming Proxy Request ---');
    console.log('Model:', model);
    console.log('Messages count:', messages ? messages.length : 0);

    if (!apiKey) {
        console.error('ERROR: GROQ_API_KEY environment variable is missing on Vercel.');
        return res.status(500).json({
            error: 'GROQ_API_KEY is not configured.',
            instruction: 'Please add GROQ_API_KEY in your Vercel Project Settings -> Environment Variables.'
        });
    }

    try {
        console.log('Forwarding request to Groq API...');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages,
                temperature: temperature || 0.3,
                max_tokens: max_tokens || 1000,
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
    } catch (error) {
        console.error('Internal Proxy Exception:', error.message);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
