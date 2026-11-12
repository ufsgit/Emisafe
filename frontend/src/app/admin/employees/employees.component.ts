import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EmployeeService, Employee } from '../../core/services/employee.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private toast = inject(ToastService);

  public employees = signal<Employee[]>([]);
  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;
  public search = '';
  public statusFilter = '';
  public isLoading = signal<boolean>(false);

  // Modal State
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Confirm Modal State
  public showConfirmModal = signal<boolean>(false);
  public selectedEmployee = signal<Employee | null>(null);

  // Delete Modal State
  public showDeleteModal = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);

  // Form Data
  public formData: Partial<Employee> = {
    name: '',
    email: '',
    phone: '',
    emirates_id: '',
    job_title: '',
    date_of_birth: '',
    nationality: '',
    gender: undefined,
    is_active: 1,
    address: ''
  };

  private searchTimeout: any;

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService.getEmployees({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search,
      status: this.statusFilter
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.employees.set(res.data.employees);
          this.totalCount.set(res.data.pagination.total);
          this.totalPages.set(res.data.pagination.totalPages);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load employees.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadEmployees();
    }, 300);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadEmployees();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadEmployees();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');
    this.formData = {
      name: '',
      email: '',
      phone: '',
      emirates_id: '',
      job_title: '',
      date_of_birth: '',
      nationality: '',
      gender: undefined,
      is_active: 1,
      address: ''
    };
    this.showModal.set(true);
  }

  openEditModal(emp: Employee): void {
    this.isEditing.set(true);
    this.modalError.set('');
    this.formData = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      emirates_id: emp.emirates_id,
      job_title: emp.job_title || '',
      date_of_birth: emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : '',
      nationality: emp.nationality || '',
      gender: emp.gender,
      is_active: emp.is_active ? 1 : 0,
      address: emp.address || ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveEmployee(): void {
    const eidRegex = /^784-\d{4}-\d{7}-\d$/;
    if (!this.formData.name || !this.formData.email || !this.formData.phone || !this.formData.emirates_id) {
      this.modalError.set('Please fill out all required fields marked with *');
      return;
    }

    if (!eidRegex.test(this.formData.emirates_id.trim())) {
      this.modalError.set('Emirates ID must strictly match format 784-YYYY-XXXXXXX-X');
      return;
    }

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.employeeService.updateEmployee(this.formData.id, this.formData).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Employee updated successfully.');
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update employee.');
        }
      });
    } else {
      this.employeeService.createEmployee(this.formData).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Employee created successfully.');
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to create employee.');
        }
      });
    }
  }

  confirmToggleStatus(emp: Employee): void {
    this.selectedEmployee.set(emp);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.selectedEmployee.set(null);
  }

  executeToggleStatus(): void {
    const emp = this.selectedEmployee();
    if (!emp) return;

    this.employeeService.toggleStatus(emp.id).subscribe({
      next: (res) => {
        this.closeConfirmModal();
        this.toast.success(res.message);
        this.loadEmployees();
      },
      error: (err) => {
        this.closeConfirmModal();
        this.toast.error(err.error?.message || 'Failed to update employee status.');
      }
    });
  }

  confirmDelete(emp: Employee): void {
    this.selectedEmployee.set(emp);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.selectedEmployee.set(null);
  }

  executeDelete(): void {
    const emp = this.selectedEmployee();
    if (!emp || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.selectedEmployee.set(null);
        this.toast.success(res.message);
        this.loadEmployees();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(err.error?.message || 'Failed to delete employee.');
      }
    });
  }
}

