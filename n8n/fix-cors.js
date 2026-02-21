const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'firsthour-workflow.json');
try {
    const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

    wf.nodes.forEach(n => {
        if (n.type === 'n8n-nodes-base.webhook') {
            n.parameters.httpMethod = 'POST';
            // ensure options has allowedOrigins
            n.parameters.options = n.parameters.options || {};
            n.parameters.options.allowedOrigins = '*';
        }
    });

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('WEBHOOK METHODS UPDATED TO POST');
} catch (e) {
    console.error(e);
}
