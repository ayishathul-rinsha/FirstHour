const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'firsthour-workflow.json');

try {
    const data = fs.readFileSync(wfPath, 'utf8');
    const wf = JSON.parse(data);

    let baseX = 220;
    let y = 700;

    const followupWebhook = {
        "parameters": {
            "path": "firsthour-followup",
            "responseMode": "responseNode",
            "options": {
                "allowedOrigins": "*"
            }
        },
        "id": "webhook-followup",
        "name": "Follow-Up Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [baseX, y],
        "webhookId": "firsthour-followup-endpoint"
    };

    const groqFollowup = {
        "parameters": {
            "method": "POST",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "sendHeaders": true,
            "headerParameters": {
                "parameters": [
                    { "name": "Authorization", "value": "=Bearer {{ $env.GROQ_API_KEY }}" },
                    { "name": "Content-Type", "value": "application/json" }
                ]
            },
            "sendBody": true,
            "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'You are the FirstHour guide, an empathetic assistant helping Indian cybercrime victims through their action plan. They just completed some steps. Always respond with ONLY valid JSON, no markdown, no code fences. Output: { \"message\": \"Encouraging/guiding text\", \"nextSteps\": [\"step 1\", \"step 2\"], \"encouragement\": \"Short sign off\" }' }, { role: 'user', content: `Crime: ${$json.body.crimeType}\\nPlatform: ${$json.body.paymentPlatform}\\nAmount: ${$json.body.amountLost}\\nCompleted steps:\\n${$json.body.completedSteps.join('\\n')}\\nCurrent Phase: ${$json.body.currentPhase}\\nUser says: ${$json.body.userMessage}\\n\\nAcknowledge their progress and tell them exactly what to do next based on the phase they are in.` }], temperature: 0.3, max_tokens: 500 }) }}",
            "options": {}
        },
        "id": "groq-followup",
        "name": "Groq Follow-Up Chat",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [baseX + 220, y]
    };

    const followupRespond = {
        "parameters": {
            "respondWith": "json",
            "responseBody": "={{ $json.choices[0].message.content }}",
            "options": {
                "responseHeaders": {
                    "entries": [
                        { "name": "Access-Control-Allow-Origin", "value": "*" }
                    ]
                }
            }
        },
        "id": "respond-followup",
        "name": "Respond Follow-Up",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [baseX + 440, y]
    };

    wf.nodes.push(followupWebhook, groqFollowup, followupRespond);

    wf.connections["Follow-Up Webhook"] = { "main": [[{ "node": "Groq Follow-Up Chat", "type": "main", "index": 0 }]] };
    wf.connections["Groq Follow-Up Chat"] = { "main": [[{ "node": "Respond Follow-Up", "type": "main", "index": 0 }]] };

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('FOLLOWUP ADDED');
} catch (e) {
    console.error(e);
}
