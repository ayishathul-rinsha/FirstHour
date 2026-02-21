import { Component } from '@angular/core';
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
export class IncidentFormComponent {
    form: FormGroup;
    isSubmitting = false;
    loadingMessage = '';

    readonly loadingMessages = [
        'We\'re reviewing your situation…',
        'Looking up the relevant laws that protect you…',
        'Preparing your personalised action plan…',
        'Almost ready — putting together your report…'
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
            description: ['', [Validators.required, Validators.minLength(20)]],
            amountLost: [null, [Validators.required, Validators.min(1)]],
            incidentTime: ['', Validators.required],
            paymentPlatform: ['', Validators.required]
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
            next: (result) => {
                this.isSubmitting = false;
                this.router.navigate(['/results'], { state: { result, report } });
            },
            error: () => {
                this.isSubmitting = false;
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
}
