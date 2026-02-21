import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="app-header">
      <a routerLink="/" class="app-logo">
        <span class="logo-icon">🛡️</span>
        <span class="logo-text">First<span class="logo-accent">Hour</span></span>
      </a>
      <p class="app-tagline">Your first hour matters. We're here to help.</p>
    </header>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: var(--surface-primary);
      border-bottom: 1px solid var(--border-color);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .app-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--text-primary);
    }

    .logo-icon {
      font-size: 1.4rem;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .logo-accent {
      background: linear-gradient(135deg, var(--accent-teal), var(--accent-violet));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .app-tagline {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    main {
      min-height: calc(100vh - 60px);
    }

    @media (max-width: 640px) {
      .app-header {
        padding: 0.75rem 1rem;
      }

      .app-tagline {
        display: none;
      }
    }
  `]
})
export class AppComponent { }
