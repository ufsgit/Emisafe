import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReportService, EmployeeReportRow, TypeReportRow } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  private reportService = inject(ReportService);
  private toast = inject(ToastService);

  public activeTab = signal<'employee' | 'type'>('employee');
  public employeeRows = signal<EmployeeReportRow[]>([]);
  public typeRows = signal<TypeReportRow[]>([]);
  public isLoading = signal<boolean>(false);

  // Search (Candidates tab)
  public searchQuery = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSub: Subscription | null = null;

  // Pagination (server-side)
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public totalCount = signal<number>(0);
  public pageSize = 10;

  ngOnInit(): void {
    this.loadActiveReport();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.activeSub?.unsubscribe();
  }

  setActiveTab(tab: 'employee' | 'type'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadActiveReport();
  }

  onSearchInput(value?: string): void {
    if (value !== undefined) {
      this.searchQuery = value;
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadActiveReport();
    }, 300);
  }

  triggerSearchNow(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.currentPage.set(1);
    this.loadActiveReport();
  }

  clearSearch(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadActiveReport();
  }

  loadActiveReport(): void {
    this.activeSub?.unsubscribe();
    this.isLoading.set(true);

    if (this.activeTab() === 'employee') {
      const query = {
        page: this.currentPage(),
        limit: this.pageSize,
        search: this.searchQuery.trim() || undefined
      };
      this.activeSub = this.reportService.getEmployeeWiseReport(query).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success && res.data) {
            this.employeeRows.set(res.data.report);
            if (res.data.pagination) {
              this.totalCount.set(res.data.pagination.total);
              this.totalPages.set(res.data.pagination.totalPages);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Failed to load candidate-wise report.');
        }
      });
    } else {
      const query = { page: this.currentPage(), limit: this.pageSize };
      this.activeSub = this.reportService.getTypeWiseReport(query).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success && res.data) {
            this.typeRows.set(res.data.report);
            if (res.data.pagination) {
              this.totalCount.set(res.data.pagination.total);
              this.totalPages.set(res.data.pagination.totalPages);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Failed to load certification scope report.');
        }
      });
    }
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadActiveReport();
    }
  }

  exportCsv(): void {
    if (this.activeTab() === 'employee') {
      this.reportService.downloadEmployeeWiseCsv(this.searchQuery);
      this.toast.success('Downloading candidate-wise report CSV...');
    } else {
      this.reportService.downloadTypeWiseCsv();
      this.toast.success('Downloading certification scope report CSV...');
    }
  }
}
