import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportService, EmployeeReportRow, TypeReportRow } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportService);
  private toast = inject(ToastService);

  public activeTab = signal<'employee' | 'type'>('employee');
  public employeeRows = signal<EmployeeReportRow[]>([]);
  public typeRows = signal<TypeReportRow[]>([]);
  public isLoading = signal<boolean>(false);

  // Pagination (server-side)
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public totalCount = signal<number>(0);
  public pageSize = 10;

  ngOnInit(): void {
    this.loadActiveReport();
  }

  setActiveTab(tab: 'employee' | 'type'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadActiveReport();
  }

  loadActiveReport(): void {
    this.isLoading.set(true);
    const query = { page: this.currentPage(), limit: this.pageSize };

    if (this.activeTab() === 'employee') {
      this.reportService.getEmployeeWiseReport(query).subscribe({
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
      this.reportService.getTypeWiseReport(query).subscribe({
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
      this.reportService.downloadEmployeeWiseCsv();
      this.toast.success('Downloading candidate-wise report CSV...');
    } else {
      this.reportService.downloadTypeWiseCsv();
      this.toast.success('Downloading certification scope report CSV...');
    }
  }
}

