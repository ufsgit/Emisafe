import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LoginHistoryService, LoginHistoryEntry } from '../../core/services/login-history.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './login-history.component.html',
  styleUrls: ['./login-history.component.scss']
})
export class LoginHistoryComponent implements OnInit {
  private historyService = inject(LoginHistoryService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  public entries = signal<LoginHistoryEntry[]>([]);
  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;
  public search = '';
  public isLoading = signal<boolean>(false);

  private searchTimeout: any;

  private roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'certification_manager', label: 'Certification Manager' },
    { value: 'examiner', label: 'Examiner' },
    { value: 'technical_coordinator', label: 'Technical Coordinator' }
  ];

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.toast.error('Administrator access required.');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.historyService.getLoginHistory({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.entries.set(res.rows);
        this.totalCount.set(res.total);
        this.totalPages.set(res.pages);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load login history.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadHistory();
    }, 300);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadHistory();
    }
  }

  roleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label || role || '—';
  }

  /** user_agent truncated for the dense table (full value in the title attr). */
  deviceLabel(ua?: string): string {
    if (!ua) return '—';
    const clean = ua.replace(/\s+/g, ' ').trim();
    return clean.length > 52 ? clean.substring(0, 52) + '…' : clean;
  }
}
