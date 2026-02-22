import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, forkJoin, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { IncidentReport, CaseResult, FollowUpRequest, FollowUpResponse, Helpline } from '../models/models';
import { environment } from '../../environments/environment';
import * as Papa from 'papaparse';

@Injectable({
    providedIn: 'root'
})
export class FirsthourService {

    constructor(private http: HttpClient) { }

    submitCase(report: IncidentReport): Observable<CaseResult> {
        if (environment.useMockData) {
            return of(this.getMockResult(report)).pipe(delay(2500));
        }

        const apiKey = environment.groqApiKey;
        if (!apiKey) {
            console.warn('No Groq API key found, falling back to mock data');
            return of(this.getMockResult(report)).pipe(delay(1000));
        }

        const prompt = `
You are an expert Indian cybercrime legal advisor and cybersecurity expert.
A victim has just submitted the following incident report:
- Incident Type: ${report.incidentType}
- Description: ${report.description}
- Amount Lost: ₹${report.amountLost || 'N/A'}
- Payment Platform: ${report.paymentPlatform || 'N/A'}
- Time: ${report.incidentTime}

Analyze this report and provide a comprehensive response IN STRICT JSON FORMAT ONLY. Do not use markdown blocks like \`\`\`json. Just output the raw JSON object.
Use this EXACT schema:
{
  "whatHappened": {
    "crimeType": "Plain English Classification",
    "summary": "2-3 sentences explaining exactly how the scam worked based on their description",
    "reassurance": "Empathetic acknowledgment (1-2 sentences) reassuring them that this is common and they are doing the right thing."
  },
  "evidenceChecklist": [
    { "id": 1, "text": "Specific evidence to save (e.g. Call logs)", "checked": false },
    { "id": 2, "text": "Another specific evidence", "checked": false }
  ],
  "legalProtections": [
    {
      "title": "Friendly title",
      "section": "Section reference (e.g. IT Act Section 66C)",
      "explanation": "Plain English explanation",
      "howItHelps": "How this protects the victim"
    }
  ],
  "recoveryWindow": {
    "percentage": [number between 15-90],
    "message": "Hopeful message about their recovery window",
    "hoursRemaining": [number representing hours left in typical 24-72h chargeback window based on incident time],
    "encouragement": "A short encouraging sentence"
  },
  "actionPlan": [
    {
      "timeframe": "30min",
      "label": "Right Now",
      "description": "Why these steps matter",
      "steps": ["Call 1930", "Freeze bank account"],
      "done": false
    },
    {
      "timeframe": "2hr",
      "label": "Within 2 Hours",
      "description": "Why these steps matter",
      "steps": ["Visit branch", "Get written acknowledgment"],
      "done": false
    },
    {
      "timeframe": "24hr",
      "label": "By Tomorrow",
      "description": "Why these steps matter",
      "steps": ["File FIR at police station"],
      "done": false
    }
  ],
  "complaintDraft": "A COMPLETE FIR complaint draft with placeholders like [Your Full Name]. Reference IT Act sections. Use \\n for line breaks."
}
        `;

        const useProxy = !apiKey || !apiKey.startsWith('gsk_');
        const url = useProxy ? '/api/chat' : 'https://api.groq.com/openai/v1/chat/completions';

        const headers: any = { 'Content-Type': 'application/json' };
        if (!useProxy) {
            headers['Authorization'] = 'Bearer ' + apiKey;
        }

        const body = {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 3000,
            response_format: { type: "json_object" }
        };

        const aiCall$ = this.http.post<any>(url, body, { headers }).pipe(
            map(response => {
                // The Groq API response structure via proxy
                if (response.choices && response.choices.length > 0) {
                    const content = response.choices[0].message.content;
                    return JSON.parse(content) as CaseResult;
                }

                // If the proxy returns an error directly
                if (response.error) {
                    throw new Error(response.error + (response.instruction ? '. ' + response.instruction : ''));
                }

                throw new Error('Malformed AI response. Please check Vercel logs.');
            }),
            catchError(err => {
                console.error('AI Proxy Error:', err);
                // On error, we still need to return a valid CaseResult (empty or mock) to prevent UI crash
                return throwError(() => err);
            })
        );

        const csvCall$ = this.http.get('assets/helplines.csv', { responseType: 'text' }).pipe(
            map(csvData => {
                const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
                return parsed.data as any[];
            }),
            catchError(() => of([])) // Return empty array if CSV fails to load
        );

        return forkJoin({ aiResult: aiCall$, helplinesData: csvCall$ }).pipe(
            map(({ aiResult, helplinesData }) => {
                const platform = (report.paymentPlatform || '').toLowerCase();

                // Find matching helplines based on platform name
                let matched = helplinesData.filter(h => {
                    const bankName = (h['Bank/Platform'] || '').toLowerCase();
                    const platLower = platform.toLowerCase();
                    return platLower.includes(bankName) || bankName.includes(platLower.split(' ')[0]);
                });

                // Always include National Cyber Crime
                const national = helplinesData.filter(h => {
                    const name = (h['Bank/Platform'] || '').toLowerCase();
                    return name.includes('national') || name.includes('rbi') || name.includes('police');
                });

                // Combine and map to the Helpline interface
                const relevantRaw = [...matched, ...national];

                // Deduplicate by bankPlatform and format safely
                const uniqueMap = new Map();
                for (const raw of relevantRaw) {
                    if (raw['Bank/Platform'] && !uniqueMap.has(raw['Bank/Platform'])) {
                        uniqueMap.set(raw['Bank/Platform'], {
                            bankPlatform: raw['Bank/Platform'] || 'Unknown',
                            fraudHelpline: raw['Fraud Helpline'] || '1930',
                            nodalOfficerEmail: raw['Nodal Officer Email'] || 'complaint-cyber@gov.in',
                            chargebackWindow: raw['Chargeback Window (Hours)'] || '72',
                            officialPortal: raw['Official Portal'] || 'https://cybercrime.gov.in'
                        });
                    }
                }

                aiResult.helplines = Array.from(uniqueMap.values());
                return aiResult;
            })
        );
    }

    getFollowUp(request: FollowUpRequest): Observable<FollowUpResponse> {
        if (environment.useMockData) {
            return of((this as any).getMockFollowUp(request)).pipe(delay(1200));
        }

        const apiKey = environment.groqApiKey;
        // Proceed to proxy if no valid key is found locally

        const prompt = `
You are the FirstHour Legal & Financial Advisor, an expert in Indian Cyber Law and RBI (Reserve Bank of India) guidelines. 
You are speaking DIRECTLY to a victim of a cybercrime who needs URGENT, practical, and highly specific legal help. Do NOT give generic "stay calm" advice. 

Context:
- Crime Type: ${request.crimeType}
- Actions they already took: ${request.completedSteps.length ? request.completedSteps.join(', ') : 'None'}
- Current Phase of Recovery: ${request.currentPhase}
- User's Question/Statement: "${request.userMessage}"

INSTRUCTIONS:
1. Provide a direct, highly empathetic, but fiercely actionable response.
2. If it's a financial fraud, quote relevant RBI Guidelines (e.g., 'Zero Liability Circular of 2017') dictating that reporting within 3 days shifts liability to the bank. 
3. If it's social media/harassment, quote specific sections of the IT Act (e.g., Section 66E, 67, or 67A) and mandate them to use the National Cyber Crime portal (cybercrime.gov.in) immediately to freeze the content.
4. Give them EXACTLY 1 to 2 next steps. Be incredibly specific. 
5. Keep the total response under 4 sentences. Make every word count.

OUTPUT FORMAT: Strict JSON only matching exactly this schema:
{
  "message": "Direct, empathetic, and legally actionable response.",
  "nextSteps": ["Specific step 1", "Specific step 2"],
  "encouragement": "A strong, empowering closing sentence telling them they have legal rights."
}
        `;

        const useProxy = !apiKey || !apiKey.startsWith('gsk_');
        const url = useProxy ? '/api/chat' : 'https://api.groq.com/openai/v1/chat/completions';

        const headers: any = { 'Content-Type': 'application/json' };
        if (!useProxy) {
            headers['Authorization'] = 'Bearer ' + apiKey;
        }

        const body = {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        };

        return this.http.post<any>(url, body, { headers }).pipe(
            map(response => {
                if (response.choices && response.choices.length > 0) {
                    const content = response.choices[0].message.content;
                    return JSON.parse(content) as FollowUpResponse;
                }

                if (response.error) {
                    throw new Error(response.error);
                }

                throw new Error('Malformed Followup response');
            }),
            catchError(err => {
                console.error('Followup Proxy Error:', err);
                return of((this as any).getMockFollowUp(request));
            })
        );
    }

    triggerOfficialEmails(report: IncidentReport): Observable<{ success: boolean }> {
        // Since we are completely serverless now, we just mock the email success
        // In a real production app, this would hit a cloud function (like Firebase or AWS Lambda) using SendGrid/Resend
        return of({ success: true }).pipe(delay(2000));
    }

    private getMockFollowUp(request: FollowUpRequest): FollowUpResponse {
        const completedCount = request.completedSteps.length;
        const phase = request.currentPhase;

        if (phase === '30min' || completedCount <= 2) {
            return {
                message: `Great job taking those first steps! You've already done ${completedCount} important thing${completedCount > 1 ? 's' : ''}. The most critical actions right now are about freezing the transaction and creating an official record.`,
                nextSteps: [
                    'If you haven\'t already, call your bank\'s fraud helpline — every minute counts for freezing the funds',
                    'Open cybercrime.gov.in in another tab and file your complaint — it takes about 10 minutes',
                    'Keep your phone nearby — the bank may call you back for verification'
                ],
                encouragement: 'You\'re handling this really well. Most people freeze up, but you\'re taking action. That makes all the difference.'
            };
        } else if (phase === '2hr' || completedCount <= 5) {
            return {
                message: `You're making excellent progress — ${completedCount} steps done! Now it's time to strengthen your case with physical documentation. This will make the investigation much smoother.`,
                nextSteps: [
                    'Visit your nearest bank branch with ID proof and your transaction screenshots',
                    'Ask the branch manager specifically for a "written acknowledgment" of your fraud report',
                    'Request them to initiate a chargeback — mention the RBI circular on customer liability',
                    'Save the bank\'s reference number somewhere safe'
                ],
                encouragement: 'The fact that you\'re following through shows real strength. Banks take quick reporters much more seriously.'
            };
        } else {
            return {
                message: `Amazing — you've completed ${completedCount} steps! You've done everything within your power in the critical window. Now it's about formal documentation and follow-up.`,
                nextSteps: [
                    'Visit your nearest police station with all evidence and file an FIR',
                    'Get a physical copy of the FIR — you\'ll need it for insurance or bank claims',
                    'Log into cybercrime.gov.in and check your complaint status — note down the reference number',
                    'Set a reminder to follow up with your bank in 3 days if you haven\'t heard back'
                ],
                encouragement: 'You\'ve done an incredible job. Many fraud cases with this level of quick response result in partial or full recovery. Stay hopeful.'
            };
        }
    }

    private getMockResult(report: IncidentReport): CaseResult {
        const hoursElapsed = Math.max(0,
            (Date.now() - new Date(report.incidentTime).getTime()) / (1000 * 60 * 60)
        );
        const recoveryPct = hoursElapsed < 1 ? 85 : hoursElapsed < 4 ? 65 : hoursElapsed < 24 ? 40 : 20;
        const hoursRemaining = Math.max(0, Math.round(24 - hoursElapsed));

        return {
            whatHappened: {
                crimeType: 'UPI Payment Fraud',
                summary: `Based on what you described, this appears to be a UPI payment fraud involving ${report.paymentPlatform}. The person likely tricked you into authorising a payment or a collect request. This is a very common type of cybercrime in India, and you are not alone — thousands of people face this every day.`,
                reassurance: 'You did the right thing by seeking help quickly. The sooner you act, the better your chances of recovering your money.'
            },
            evidenceChecklist: [
                { id: 1, text: 'Take screenshots of the fraudulent transaction(s) from your banking app', checked: false },
                { id: 2, text: 'Save any messages, emails, or call logs from the fraudster', checked: false },
                { id: 3, text: 'Note down the UPI ID or phone number used by the fraudster', checked: false },
                { id: 4, text: 'Write down exactly what happened while it\'s fresh in your memory', checked: false },
                { id: 5, text: 'Keep your bank account statement for the last 7 days ready', checked: false },
                { id: 6, text: 'If you clicked any links, save the URLs (don\'t open them again)', checked: false }
            ],
            legalProtections: [
                {
                    title: 'IT Act Section 66C — Identity Theft Protection',
                    section: 'Section 66C, Information Technology Act 2000',
                    explanation: 'If someone used your identity or credentials to commit fraud, the law specifically protects you.',
                    howItHelps: 'The fraudster can face up to 3 years imprisonment and a fine. This law recognises that you are the victim, not the wrongdoer.'
                },
                {
                    title: 'IT Act Section 66D — Cheating by Personation',
                    section: 'Section 66D, Information Technology Act 2000',
                    explanation: 'If the fraudster pretended to be someone else (a bank official, a government officer, etc.) to deceive you, this section applies.',
                    howItHelps: 'This carries a punishment of up to 3 years imprisonment and a fine of up to ₹1 lakh. Your complaint becomes stronger with this section.'
                },
                {
                    title: 'RBI Circular on Customer Liability',
                    section: 'RBI/2017-18/15, July 2017',
                    explanation: 'The Reserve Bank of India limits your liability in unauthorised electronic transactions, especially if you report quickly.',
                    howItHelps: `If you report within 3 days, your liability is limited. Reporting within 24 hours can mean zero liability. You're within the window — act now.`
                }
            ],
            recoveryWindow: {
                percentage: recoveryPct,
                message: hoursElapsed < 4
                    ? `You still have a strong window of opportunity. If you act within the next ${Math.max(1, Math.round(4 - hoursElapsed))} hours, your chances are very good.`
                    : hoursElapsed < 24
                        ? `You still have time. Filing your complaint today keeps your recovery chances open.`
                        : `While some time has passed, recovery is still possible. Many cases are resolved even after 24 hours — don't give up.`,
                hoursRemaining: hoursRemaining,
                encouragement: 'Every step you take from this point forward improves your situation.'
            },
            actionPlan: [
                {
                    timeframe: '30min',
                    label: 'Right Now',
                    description: 'These are the most critical steps. Do these first.',
                    steps: [
                        'Call your bank\'s fraud helpline immediately and request a transaction freeze',
                        'File a complaint on the National Cybercrime Portal: cybercrime.gov.in',
                        'Call 1930 (National Cybercrime Helpline) to register your complaint',
                        'Do NOT delete any messages or call logs from the fraudster'
                    ],
                    done: false
                },
                {
                    timeframe: '2hr',
                    label: 'Within 2 Hours',
                    description: 'These steps strengthen your case significantly.',
                    steps: [
                        'Visit your nearest bank branch with your ID proof and transaction details',
                        'Request a written acknowledgment of your fraud complaint from the bank',
                        'Take screenshots of all evidence (transactions, messages, call history)',
                        'If money was sent via UPI, ask your bank to initiate a chargeback request'
                    ],
                    done: false
                },
                {
                    timeframe: '24hr',
                    label: 'By Tomorrow',
                    description: 'These steps help with the formal investigation.',
                    steps: [
                        'Visit your nearest police station and file an FIR with all your evidence',
                        'Get a copy of the FIR — you\'ll need this for the bank\'s investigation',
                        'Follow up on your cybercrime.gov.in complaint — note down your complaint number',
                        'Inform the payment platform (Google Pay / PhonePe / Paytm) about the fraud'
                    ],
                    done: false
                }
            ],
            complaintDraft: `To,
The Station House Officer,
[Your Nearest Police Station]

Subject: Complaint regarding Cyber Fraud / UPI Payment Fraud

Respected Sir/Madam,

I, [Your Full Name], resident of [Your Address], would like to report a case of cyber fraud that took place on ${new Date(report.incidentTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at approximately ${new Date(report.incidentTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.

Details of the incident:
${report.description}
${report.amountLost ? `
The fraudulent transaction was made through ${report.paymentPlatform} for an amount of ₹${report.amountLost.toLocaleString('en-IN')}.
` : ''}
I have preserved all relevant evidence including transaction screenshots, communication records with the fraudster, and bank statements.

I request you to kindly register an FIR under the relevant sections of the Information Technology Act, 2000 (Sections 66C, 66D) and the Indian Penal Code (Section 420 — Cheating), and investigate this matter at the earliest.

I also wish to inform you that I have already:
1. Reported this incident to the National Cybercrime Helpline (1930)
2. Filed a complaint on cybercrime.gov.in
3. Informed my bank and requested a transaction freeze

I am ready to provide any further assistance required for the investigation.

Thanking you,
[Your Full Name]
[Your Phone Number]
[Your Email Address]
Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            helplines: [
                {
                    bankPlatform: 'National Cyber Crime',
                    fraudHelpline: '1930',
                    nodalOfficerEmail: 'complaint-cyber@gov.in',
                    chargebackWindow: '24',
                    officialPortal: 'https://cybercrime.gov.in'
                }
            ]
        };
    }
}
