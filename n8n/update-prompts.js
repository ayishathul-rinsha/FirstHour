const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'firsthour-workflow.json');

try {
    const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

    const findNode = name => wf.nodes.find(n => n.name === name);

    const getBodyStr = (sysPrompt, userPrompt) => {
        const obj = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1500
        };
        return `={{ JSON.stringify(${JSON.stringify(obj)}) }}`;
    };

    // Node 1
    const classifyNode = findNode("1. Understand - Classify Crime");
    if (classifyNode) {
        const sysPrompt = "You are a calm, empathetic legal and cybersecurity assistant helping a cybercrime victim in India. They just submitted an incident report. Read the description. Classify what happened in simple, non-frightening terms (e.g. 'This sounds like someone gained unauthorized access to your account' or 'This appears to be online harassment'). Include a very brief, empathetic acknowledgment (1-2 sentences) reassuring them that this is completely common and they are doing the right thing by acting quickly. Do not blame the victim. ONLY OUTPUT VALID JSON in this format: { \"crimeType\": \"Plain English Classification\", \"acknowledgment\": \"Empathetic sentence\" }";
        const userPrompt = "Incident Type: {{$json.body.incidentType}}\\nDescription: {{$json.body.description}}\\nAmount Lost: {{$json.body.amountLost || 'N/A'}}\\nPayment Platform: {{$json.body.paymentPlatform || 'N/A'}}";
        classifyNode.parameters.jsonBody = getBodyStr(sysPrompt, userPrompt);
    }

    // Node 2
    const gatherNode = findNode("2. Gather - Evidence Checklist");
    if (gatherNode) {
        const sysPrompt = "You are helping a cybercrime victim in India gather evidence. Based on the incident description and type, create a checklist of 3-5 specific things they need to save immediately. Frame it gently as 'Things that will help your case'. Examples: Call logs, screenshots of profiles/chats, bank statements, URLs of abusive posts, device logs. ONLY OUTPUT VALID JSON in this format: { \"evidenceChecklist\": [\"Item 1: Explanation\", \"Item 2: Explanation\"] }";
        const userPrompt = "Incident Type: {{$['Webhook'].item.body.incidentType}}\\nDescription: {{$['Webhook'].item.body.description}}";
        gatherNode.parameters.jsonBody = getBodyStr(sysPrompt, userPrompt);
    }

    // Node 4 
    const empowerNode = findNode("4. Empower - Recovery Window");
    if (empowerNode) {
        const sysPrompt = "You are a cybercrime response expert. Based on the time since the incident and the type of crime, provide a hopeful 'Recovery Window' message. For financial fraud within 2 hours, mention the RBI golden hour for freezing funds. For non-financial crimes (harassment, morphing, hacking), focus on immediate impact mitigation (e.g., 'If we report this to the platform now, we can block the account and prevent further spread within hours'). NEVER give a percentage probability. Always focus on the power of acting quickly. ONLY OUTPUT VALID JSON in this format: { \"recoveryMessage\": \"Your hopeful message\" }";
        const userPrompt = "Incident Type: {{$['Webhook'].item.body.incidentType}}\\nIncident Time: {{$['Webhook'].item.body.incidentTime}}\\nDescription: {{$['Webhook'].item.body.description}}";
        empowerNode.parameters.jsonBody = getBodyStr(sysPrompt, userPrompt);
    }

    // Node 5
    const actNode = findNode("5. Act - Draft Action Plan");
    if (actNode) {
        const sysPrompt = "You are generating the final action plan. Create a 3-step timeline (Right now, Next 2 hours, By tomorrow) based on the incident type. For financial: block cards/UPI, call 1930, visit bank, file FIR. For harassment/morphing/hacking: block accounts, report to platform, save profile URLs, file complaint at cybercrime.gov.in. Also draft a simple, formal complaint addressed to the Cyber Cell, Bank, or Social Media platform (as appropriate). ONLY OUTPUT VALID JSON in this format: { \"timeline\": [{\"timeframe\": \"Right now\", \"label\": \"Immediate actions\", \"description\": \"Summary\", \"steps\": [\"step 1\"]}, {\"timeframe\": \"Next 2 hours\", \"label\": \"Secondary actions\", \"description\": \"\", \"steps\": []}, {\"timeframe\": \"By tomorrow\", \"label\": \"Official reporting\", \"description\": \"\", \"steps\": []}], \"complaintDraft\": \"Dear Sir/Madam,...\" }";
        const userPrompt = "Incident Type: {{$['Webhook'].item.body.incidentType}}\\nDescription: {{$['Webhook'].item.body.description}}\\nAmount: {{$['Webhook'].item.body.amountLost || 'N/A'}}";
        actNode.parameters.jsonBody = getBodyStr(sysPrompt, userPrompt);
    }

    // Follow-up chat
    const followupNode = findNode("Groq Follow-Up Chat");
    if (followupNode) {
        const sysPrompt = "You are the FirstHour guide, an empathetic assistant helping Indian cybercrime victims through their action plan. They just completed some steps. Always respond with ONLY valid JSON, no markdown, no code fences. Output: { \"message\": \"Encouraging/guiding text\", \"nextSteps\": [\"step 1\", \"step 2\"], \"encouragement\": \"Short sign off\" }";
        const userPrompt = "Crime: {{$json.body.crimeType}}\\nType: {{$json.body.incidentType}}\\nCompleted steps:\\n{{$json.body.completedSteps.join('\\n')}}\\nCurrent Phase: {{$json.body.currentPhase}}\\nUser says: {{$json.body.userMessage}}\\nAcknowledge their progress and tell them exactly what to do next.";
        followupNode.parameters.jsonBody = getBodyStr(sysPrompt, userPrompt);
    }

    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
    console.log('N8N PROMPTS UPDATED');
} catch (e) {
    console.error(e);
}
