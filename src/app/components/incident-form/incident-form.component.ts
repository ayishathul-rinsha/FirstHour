import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirsthourService } from '../../services/firsthour.service';
import { IncidentReport } from '../../models/models';

@Component({
    selector: 'app-incident-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './incident-form.component.html',
    styleUrls: ['./incident-form.component.css']
})
export class IncidentFormComponent implements OnInit {
    form: FormGroup;
    isSubmitting = false;
    loadingMessage = '';

    readonly loadingMessages = [
        'We\'re reviewing your situation…',
        'Looking up the relevant laws that protect you…',
        'Preparing your personalised action plan…',
        'Almost ready — putting together your report…'
    ];

    readonly incidentTypes = [
        'Financial Fraud (UPI, Credit Card, Bank, etc.)',
        'Cyberbullying / Online Harassment',
        'Morphing / Sextortion',
        'Identity Theft / Fake Profile',
        'Hacking / Account Compromise',
        'Other Cybercrime'
    ];

    readonly paymentPlatforms = [
        'UPI (Google Pay, PhonePe, Paytm, etc.)',
        'Net Banking',
        'Credit Card',
        'Debit Card',
        'Mobile Wallet',
        'Other'
    ];

    constructor(
        private fb: FormBuilder,
        private firsthourService: FirsthourService,
        private router: Router
    ) {
        this.form = this.fb.group({
            incidentType: ['', Validators.required],
            description: ['', [Validators.required, Validators.minLength(20)]],
            amountLost: [null],
            incidentTime: ['', Validators.required],
            paymentPlatform: ['']
        });
    }

    ngOnInit(): void {
        // Watch incidentType to conditionally require financial fields
        this.form.get('incidentType')?.valueChanges.subscribe(type => {
            const amountCtrl = this.form.get('amountLost');
            const platformCtrl = this.form.get('paymentPlatform');

            if (type === 'Financial Fraud (UPI, Credit Card, Bank, etc.)') {
                amountCtrl?.setValidators([Validators.required, Validators.min(1)]);
                platformCtrl?.setValidators([Validators.required]);
            } else {
                amountCtrl?.clearValidators();
                amountCtrl?.setValue(null);
                platformCtrl?.clearValidators();
                platformCtrl?.setValue('');
            }

            amountCtrl?.updateValueAndValidity();
            platformCtrl?.updateValueAndValidity();
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        this.cycleLoadingMessages();

        const report: IncidentReport = this.form.value;

        this.firsthourService.submitCase(report).subscribe({
            next: (rawResult) => {
                this.isSubmitting = false;
                let result = rawResult;
                if (typeof result === 'string') {
                    try { result = JSON.parse(result); } catch (e) { }
                }
                // Handle nested stringified objects from n8n if any
                if (result && typeof result.whatHappened === 'string') {
                    try { result.whatHappened = JSON.parse(result.whatHappened); } catch (e) { }
                }
                if (result && typeof result.evidenceChecklist === 'string') {
                    try { result.evidenceChecklist = JSON.parse(result.evidenceChecklist); } catch (e) { }
                }

                // Format evidenceChecklist strings to objects if n8n returned an array of strings
                if (result && Array.isArray(result.evidenceChecklist) && result.evidenceChecklist.length > 0 && typeof result.evidenceChecklist[0] === 'string') {
                    result.evidenceChecklist = (result.evidenceChecklist as any[]).map((text: any, id: number) => ({ id, text, checked: false }));
                }

                this.router.navigate(['/results'], { state: { result, report } });
            },
            error: () => {
                this.isSubmitting = false;
                // If it truly failed, try navigating with mock data
                const mockResult = (this.firsthourService as any).getMockResult(report);
                this.router.navigate(['/results'], { state: { result: mockResult, report } });
            }
        });
    }

    private cycleLoadingMessages(): void {
        let index = 0;
        this.loadingMessage = this.loadingMessages[0];
        const interval = setInterval(() => {
            index++;
            if (index < this.loadingMessages.length) {
                this.loadingMessage = this.loadingMessages[index];
            } else {
                clearInterval(interval);
            }
        }, 800);
    }

    getMaxDateTime(): string {
        return new Date().toISOString().slice(0, 16);
    }

    get isFinancialFraud(): boolean {
        return this.form.get('incidentType')?.value === 'Financial Fraud (UPI, Credit Card, Bank, etc.)';
    }
}

