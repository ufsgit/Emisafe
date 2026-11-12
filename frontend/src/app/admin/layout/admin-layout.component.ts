import { Component, inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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

  @ViewChild('userMenuButton') userMenuButton!: ElementRef<HTMLButtonElement>;

  public currentUser = this.authService.currentUser;

  public isMobileMenuOpen = false;
  public isUserMenuOpen = false;

  public navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', link: '/admin/dashboard', exact: true },
    { label: 'Employees', icon: 'badge', link: '/admin/employees' },
    { label: 'Certificate Types', icon: 'category', link: '/admin/certificate-types' },
    { label: 'Certificates', icon: 'verified', link: '/admin/certificates' },
    { label: 'Reports', icon: 'analytics', link: '/admin/reports' }
  ];

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

  onLogout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe();
  }
}
