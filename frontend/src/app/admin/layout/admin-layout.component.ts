import { Component, inject, computed, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  external?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  private host = inject(ElementRef);
  public theme = inject(ThemeService);

  @ViewChild('userMenuButton') userMenuButton!: ElementRef<HTMLButtonElement>;

  public currentUser = this.authService.currentUser;
  public roleLabel = this.authService.roleLabel;
  public isAdmin = this.authService.isAdmin;

  public isMobileMenuOpen = false;
  public isUserMenuOpen = false;

  /** Concise display name for the compact navbar pill so it never forces horizontal overflow. */
  public compactUserName = computed(() => {
    const raw = (this.currentUser()?.name || 'Admin').trim();
    if (raw.toLowerCase() === 'system administrator') return 'Sys. Admin';
    if (raw.length > 14) return raw.split(/\s+/)[0];
    return raw;
  });

  /** Navigation items in the top bar. */
  public navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: 'Dashboard', icon: 'space_dashboard', link: '/admin/dashboard', exact: true },
      { label: 'Candidates', icon: 'badge', link: '/admin/candidates' },
      { label: 'Certificates', icon: 'verified', link: '/admin/certificates' },
      { label: 'Scopes', icon: 'category', link: '/admin/scopes' },
      { label: 'Reports', icon: 'analytics', link: '/admin/reports' }
    ];

    if (this.authService.isAdmin()) {
      items.push({ label: 'Certificate Format', icon: 'description', link: '/admin/certificate-format' });
      items.push({ label: 'Users', icon: 'group', link: '/admin/users' });
      items.push({ label: 'Login History', icon: 'history', link: '/admin/login-history' });
    }

    return items;
  });

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isUserMenuOpen) return;
    const target = event.target as Node;
    const inMenu = this.host.nativeElement.querySelector('.user-dropdown')?.contains(target);
    const inBtn = this.userMenuButton?.nativeElement.contains(target);
    if (!inMenu && !inBtn) this.isUserMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isUserMenuOpen) this.isUserMenuOpen = false;
    if (this.isMobileMenuOpen) this.isMobileMenuOpen = false;
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  onLogout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe();
  }
}
