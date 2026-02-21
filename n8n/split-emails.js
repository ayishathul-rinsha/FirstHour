const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'firsthour-workflow.json');

try {
    const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

    let baseX = 220;
    let y = 1000;

    // New webhook node
    const emailWebhook = {
        "parameters": {
            "path": "firsthour-emails",
            "responseMode": "responseNode",
            "options": {
                "allowedOrigins": "*"
            }
        },
        "id": "webhook-emails",
        "name": "Webhook - Send Emails",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [baseX, y],
        "webhookId": "firsthour-emails-endpoint"
    };

    // Immediate response node
    const emailRespond = {
        "parameters": {
            "respondWith": "json",
            "responseBody": "={ \"success\": true }",
            "options": {
                "responseHeaders": {
                    "entries": [
                        { "name": "Access-Control-Allow-Origin", "value": "*" }
                    ]
                }
            }
        },
        "id": "respond-emails",
        "name": "Respond Emails API",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1.1,
        "position": [baseX + 220, y]
    };

    wf.nodes.push(emailWebhook, emailRespond);

    // Remove connections from Assemble Response to Emails
    if (wf.connections['Assemble Response']) {
        let oldConns = wf.connections['Assemble Response']['main'][0] || [];
        // filter out the email nodes
        oldConns = oldConns.filter(c => c.node !== "Email Bank Fraud Desk" && c.node !== "Email Action Plan to Victim");
        wf.connections['Assemble Response']['main'][0] = oldConns;
    }

    // Connect new webhook to Respond Emails + the two Email nodes
    wf.connections["Webhook - Send Emails"] = {
        "main": [
            [
                { "node": "Respond Emails API", "type": "main", "index": 0 },
                { "node": "Email Bank Fraud Desk", "type": "main", "index": 0 },
                { "node": "Email Action Plan to Victim", "type": "main", "index": 0 }
            ]
        ]
    };

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('N8N WORKFLOW SPLIT FOR EMAIL VERIFICATION');
} catch (e) {
    console.error(e);
}
