import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CaseResult, IncidentReport, EvidenceItem, ActionStep, FollowUpMessage, FollowUpRequest } from '../../models/models';
import { FirsthourService } from '../../services/firsthour.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-results-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './results-dashboard.component.html',
    styleUrls: ['./results-dashboard.component.css']
})
export class ResultsDashboardComponent implements OnInit, OnDestroy {
    result!: CaseResult;
    report!: IncidentReport;
    copied = false;
    expandedLegal: number | null = null;

    // Countdown timer
    countdownHours = 0;
    countdownMinutes = 0;
    countdownSeconds = 0;
    countdownLabel = '';
    private timerInterval: any;

    // Follow-up chat
    followUpMessages: FollowUpMessage[] = [];
    followUpInput = '';
    followUpLoading = false;
    showFollowUp = false;

    // Quick action buttons
    quickActions = [
        { label: "I've called my bank", phase: '30min', icon: '📞' },
        { label: "I've filed on cybercrime.gov.in", phase: '30min', icon: '🌐' },
        { label: "I've visited the bank branch", phase: '2hr', icon: '🏦' },
        { label: "I've collected all evidence", phase: '2hr', icon: '📸' },
        { label: "I've filed the FIR", phase: '24hr', icon: '📋' },
        { label: "I've done everything, what now?", phase: 'done', icon: '✅' }
    ];

    constructor(private router: Router, private firsthourService: FirsthourService) { }

    ngOnInit(): void {
        const nav = history.state;
        if (!nav?.result) {
            this.router.navigate(['/']);
            return;
        }
        this.result = nav.result;
        this.report = nav.report;
        this.startCountdown();
    }

    ngOnDestroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    toggleEvidence(item: EvidenceItem): void {
        item.checked = !item.checked;
    }

    get checkedCount(): number {
        return this.result.evidenceChecklist.filter(i => i.checked).length;
    }

    toggleLegal(index: number): void {
        this.expandedLegal = this.expandedLegal === index ? null : index;
    }

    toggleActionDone(step: ActionStep): void {
        step.done = !step.done;
    }

    // --- Follow-up chat ---

    openFollowUp(): void {
        this.showFollowUp = true;
        if (this.followUpMessages.length === 0) {
            this.followUpMessages.push({
                role: 'assistant',
                text: 'I\'m here to help you through each step. Tap a button below or type what you\'ve done so far, and I\'ll guide you on what to do next.',
                timestamp: new Date()
            });
        }
    }

    closeFollowUp(): void {
        this.showFollowUp = false;
    }

    sendQuickAction(action: { label: string; phase: string; icon: string }): void {
        this.sendFollowUp(`${action.icon} ${action.label}`);
    }

    sendFollowUp(messageText?: string): void {
        const text = messageText || this.followUpInput.trim();
        if (!text || this.followUpLoading) return;

        // Add user message
        this.followUpMessages.push({
            role: 'user',
            text: text,
            timestamp: new Date()
        });
        this.followUpInput = '';
        this.followUpLoading = true;

        // Gather completed steps
        const completedSteps = this.result.actionPlan
            .filter(s => s.done)
            .flatMap(s => s.steps);

        // Determine current phase
        const currentPhase = this.result.actionPlan.find(s => !s.done)?.timeframe || 'done';

        const request: FollowUpRequest = {
            completedSteps,
            currentPhase,
            crimeType: this.result.whatHappened.crimeType,
            paymentPlatform: this.report.paymentPlatform,
            amountLost: this.report.amountLost,
            incidentTime: this.report.incidentTime,
            userMessage: text
        };

        this.firsthourService.getFollowUp(request).subscribe(response => {
            let replyText = response.message;
            if (response.nextSteps && response.nextSteps.length > 0) {
                replyText += '\n\n**Your next steps:**\n' +
                    response.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
            }
            if (response.encouragement) {
                replyText += `\n\n💛 ${response.encouragement}`;
            }

            this.followUpMessages.push({
                role: 'assistant',
                text: replyText,
                timestamp: new Date()
            });
            this.followUpLoading = false;
        });
    }

    copyComplaint(): void {
        navigator.clipboard.writeText(this.result.complaintDraft).then(() => {
            this.copied = true;
            setTimeout(() => this.copied = false, 2500);
        });
    }

    getRecoveryColor(): string {
        const pct = this.result.recoveryWindow.percentage;
        if (pct >= 60) return 'var(--accent-teal)';
        if (pct >= 30) return 'var(--accent-amber)';
        return 'var(--accent-violet)';
    }

    getRecoveryGradient(): string {
        const pct = this.result.recoveryWindow.percentage;
        return `conic-gradient(${this.getRecoveryColor()} ${pct * 3.6}deg, var(--surface-secondary) 0deg)`;
    }

    downloadingPdf = false;

    downloadCaseLogs(): void {
        this.downloadingPdf = true;
        const dashboardElement = document.querySelector('.dashboard-container') as HTMLElement;

        if (!dashboardElement) {
            this.downloadingPdf = false;
            return;
        }

        // Add a temporary class to optimize for PDF capture (e.g. expand all sections, hide buttons)
        dashboardElement.classList.add('pdf-capture-mode');

        html2canvas(dashboardElement, {
            scale: 2, // higher resolution
            useCORS: true,
            logging: false
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }

            pdf.save(`FirstHour_CaseLog_${new Date().getTime()}.pdf`);

            dashboardElement.classList.remove('pdf-capture-mode');
            this.downloadingPdf = false;
        }).catch(err => {
            console.error('PDF generation failed', err);
            dashboardElement.classList.remove('pdf-capture-mode');
            this.downloadingPdf = false;
        });
    }

    startNewCase(): void {
        this.router.navigate(['/']);
    }

    private startCountdown(): void {
        const incidentTime = new Date(this.report.incidentTime).getTime();
        const now = Date.now();
        const hoursElapsed = (now - incidentTime) / (1000 * 60 * 60);

        let targetHours: number;
        if (hoursElapsed < 0.5) {
            targetHours = 0.5;
            this.countdownLabel = 'Time left for immediate actions';
        } else if (hoursElapsed < 2) {
            targetHours = 2;
            this.countdownLabel = 'Time left for 2-hour action window';
        } else if (hoursElapsed < 24) {
            targetHours = 24;
            this.countdownLabel = 'Time left for 24-hour action window';
        } else {
            this.countdownLabel = 'Every action you take still helps';
            this.countdownHours = 0;
            this.countdownMinutes = 0;
            this.countdownSeconds = 0;
            return;
        }

        const targetTime = incidentTime + targetHours * 60 * 60 * 1000;

        this.timerInterval = setInterval(() => {
            const remaining = Math.max(0, targetTime - Date.now());
            this.countdownHours = Math.floor(remaining / (1000 * 60 * 60));
            this.countdownMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            this.countdownSeconds = Math.floor((remaining % (1000 * 60)) / 1000);

            if (remaining <= 0 && this.timerInterval) {
                clearInterval(this.timerInterval);
            }
        }, 1000);
    }
}
