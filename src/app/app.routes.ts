import { Routes } from '@angular/router';
import { IncidentFormComponent } from './components/incident-form/incident-form.component';
import { ResultsDashboardComponent } from './components/results-dashboard/results-dashboard.component';

export const routes: Routes = [
    { path: '', component: IncidentFormComponent },
    { path: 'results', component: ResultsDashboardComponent },
    { path: '**', redirectTo: '' }
];
