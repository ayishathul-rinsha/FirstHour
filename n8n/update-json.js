const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'firsthour-workflow.json');

try {
    const data = fs.readFileSync(wfPath, 'utf8');
    const wf = JSON.parse(data);

    let baseX = 2200;
    let y = 300;

    const emailBankNode = {
        "parameters": {
            "sendTo": "fraud_desk@dummybank.com",
            "subject": "={{ 'URGENT: Fraudulent Transaction Freeze Request - ' + $json.webhookData.paymentPlatform }}",
            "message": "={{ 'Dear Fraud Desk,\\n\\nA fraudulent transaction has been reported on platform ' + $json.webhookData.paymentPlatform + '.\\n\\nAmount: ₹' + $json.webhookData.amountLost + '\\nIncident Time: ' + $json.webhookData.incidentTime + '\\n\\nPlease freeze these funds immediately as per RBI guidelines.\\n\\nDescription:\\n' + $json.webhookData.description + '\\n\\nRegards,\\nFirstHour Automated System' }}",
            "appendAttribution": false
        },
        "id": "email-bank",
        "name": "Email Bank Fraud Desk",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": [baseX, y],
        "notes": "Sends details to the bank's fraud desk immediately"
    };

    const emailVictimNode = {
        "parameters": {
            "sendTo": "victim@example.com",
            "subject": "FirstHour: Your Action Plan & Complaint Draft",
            "message": "={{ 'Here is your personalized action plan and complaint draft.\\n\\n' + JSON.stringify($json.actionPlan, null, 2) + '\\n\\nCOMPLAINT DRAFT:\\n' + $json.complaintDraft }}",
            "appendAttribution": false
        },
        "id": "email-victim",
        "name": "Email Action Plan to Victim",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": [baseX, y + 200],
        "notes": "Emails the complete summary to the victim so they don't lose it"
    };

    const wait2hNode = {
        "parameters": {
            "amount": 2,
            "unit": "hours"
        },
        "id": "wait-2h",
        "name": "Wait 2 Hours",
        "type": "n8n-nodes-base.wait",
        "typeVersion": 1.1,
        "position": [baseX + 220, y],
        "webhookId": "dummy-wait-2h"
    };

    const email2hNode = {
        "parameters": {
            "sendTo": "victim@example.com",
            "subject": "FirstHour Reminder: Have you visited your bank branch?",
            "message": "Hi,\n\nIt's been 2 hours since you reported the fraud. Have you visited your bank branch yet to secure a written acknowledgement? This is critical.\n\nStay strong.\nFirstHour",
            "appendAttribution": false
        },
        "id": "email-2h",
        "name": "2-Hour Reminder",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": [baseX + 440, y]
    };

    const wait24hNode = {
        "parameters": {
            "amount": 22,
            "unit": "hours"
        },
        "id": "wait-24h",
        "name": "Wait 24 Hours",
        "type": "n8n-nodes-base.wait",
        "typeVersion": 1.1,
        "position": [baseX + 660, y],
        "webhookId": "dummy-wait-24h"
    };

    const email24hNode = {
        "parameters": {
            "sendTo": "victim@example.com",
            "subject": "FirstHour Reminder: Have you filed the FIR?",
            "message": "Hi,\n\nIt's been a day. Have you filed the FIR at your local police station? It is required for chargebacks and insurance.\n\nFirstHour",
            "appendAttribution": false
        },
        "id": "email-24h",
        "name": "24-Hour Reminder",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2.1,
        "position": [baseX + 880, y]
    };

    wf.nodes.push(emailBankNode, emailVictimNode, wait2hNode, email2hNode, wait24hNode, email24hNode);

    if (!wf.connections['Assemble Response']) {
        wf.connections['Assemble Response'] = { main: [[]] };
    }
    if (!wf.connections['Assemble Response']['main'][0]) {
        wf.connections['Assemble Response']['main'][0] = [];
    }

    wf.connections['Assemble Response']['main'][0].push({ node: "Email Bank Fraud Desk", type: "main", index: 0 });
    wf.connections['Assemble Response']['main'][0].push({ node: "Email Action Plan to Victim", type: "main", index: 0 });

    wf.connections["Email Bank Fraud Desk"] = { main: [[{ node: "Wait 2 Hours", type: "main", index: 0 }]] };
    wf.connections["Wait 2 Hours"] = { main: [[{ node: "2-Hour Reminder", type: "main", index: 0 }]] };
    wf.connections["2-Hour Reminder"] = { main: [[{ node: "Wait 24 Hours", type: "main", index: 0 }]] };
    wf.connections["Wait 24 Hours"] = { main: [[{ node: "24-Hour Reminder", type: "main", index: 0 }]] };

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('SUCCESS');
} catch (e) {
    console.error(e);
}
