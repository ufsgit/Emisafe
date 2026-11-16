import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'emisafe_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  public isDark = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const initialDark = this.resolveInitialTheme();
      this.applyTheme(initialDark, false);
    }
  }

  private resolveInitialTheme(): boolean {
    try {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return true;
      if (attr === 'light') return false;

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;

      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return false;
    }
  }

  public setDark(dark: boolean): void {
    this.applyTheme(dark, true);
  }

  public toggle(): void {
    this.setDark(!this.isDark());
  }

  private applyTheme(dark: boolean, persist: boolean): void {
    this.isDark.set(dark);
    if (!isPlatformBrowser(this.platformId)) return;

    const themeName = dark ? 'dark' : 'light';
    try {
      document.documentElement.setAttribute('data-theme', themeName);
      document.documentElement.style.colorScheme = themeName;
      if (persist) {
        localStorage.setItem(STORAGE_KEY, themeName);
      }
    } catch {
      // Ignore storage / DOM errors in restricted browser modes
    }
  }
}
