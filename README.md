# FirstHour - Cybercrime Recovery Assistant

FirstHour is a serverless, AI-powered web application designed to help victims of financial cybercrimes in India take immediate, critical action within the crucial "golden hour" of the incident. It uses advanced language models to analyze the victim's situation, determine the appropriate legal framework, identify the exact bank nodal officer helplines, and instantly generate a completely customized First Information Report (FIR) ready for police submission.

## Tech Stack
- **Frontend Framework:** Angular 19 (TypeScript, HTML, CSS)
- **AI Integration:** Groq API (Llama-3.3-70b-versatile model)
- **Data Parsing:** PapaParse (for client-side CSV processing)
- **PDF Generation:** jsPDF & html2canvas (for immutable case logs)
- **Hosting/Deployment:** Vercel / Firebase Hosting (Serverless SPA)

## Key Features
1. **Zero-Shot AI Analysis:** Instantly classifies the cybercrime and generates an empathetic, custom response using the Groq API.
2. **Dynamic Helpline Resolution:** Natively parses a local offline database (`helplines.csv`) to match the victim's payment platform to the exact bank Nodal Officer email and fraud helpline.
3. **Automated Legal Drafting:** Automatically generates a comprehensive, legally accurate FIR draft referencing specific sections of the Indian IT Act 2000 based on the incident context.
4. **Secure Offline PDF Export:** Generates an immutable, high-resolution PDF of the entire customized dashboard so victims can print it and physically take it to the cyber police.
5. **Interactive Checklists & Timelines:** Provides an action-oriented timeline customized to the time elapsed since the crime, and a checklist of digital evidence to preserve.
6. **100% Serverless Architecture:** Completely decoupled from any backend database or webhook requirements, ensuring infinite scalability and absolute privacy.

## Installation Commands

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-username/FirstHour.git
   cd FirstHour
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Configure the environment variables:
   - Open `src/environments/environment.ts`
   - Add your Groq API Key to the `groqApiKey` property:
     \`\`\`typescript
     export const environment = {
         production: false,
         n8nWebhookUrl: '/webhook/firsthour',
         groqApiKey: 'gsk_YOUR_GROQ_API_KEY_HERE',
         useMockData: false
     };
     \`\`\`

## Run Commands

To start the local development server:
\`\`\`bash
npm start
\`\`\`
Navigate to \`http://localhost:4200/\` to view the application.

To build for production:
\`\`\`bash
npm run build
\`\`\`

## Secure Deployment (Vercel)

This project uses a **Serverless API Proxy** to protect your Groq API Key. This ensures your key is never exposed on GitHub or in the user's browser.

1. **Deploy to Vercel:** Push your code to GitHub and connect the repository to Vercel.
2. **Configure Environment Variables:**
   - Go to your Project Settings on Vercel.
   - Navigate to **Environment Variables**.
   - Add a new variable with the key \`GROQ_API_KEY\` and your secret \`gsk_...\` as the value.
3. **Automatic Protection:** The app will automatically detect if the key is missing in the browser and use the secure \`/api/chat\` backend bridge instead.

## Screenshots
*(Replace with actual image links once hosted)*
1. ![Landing Page](docs/screenshot1.png) - Incident Reporting Form
2. ![Results Dashboard](docs/screenshot2.png) - AI Generated Action Plan & FIR
3. ![Helpline UI](docs/screenshot3.png) - Dynamically Resolved Bank Helplines

## Demo Video
*(Replace with actual YouTube/Loom link)*
[Watch the Demo Video Here](https://youtube.com/your-video-link)

## Architecture Diagram

## API Documentation
Because FirstHour operates on a **100% Serverless SPA Architecture**, there is no proprietary backend API to document. The application communicates directly from the client browser to the Groq API inference endpoints.

## Team Members
- Ayishathul Rinsha - Lead Developer


