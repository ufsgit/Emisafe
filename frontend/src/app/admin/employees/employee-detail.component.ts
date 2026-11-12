import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EmployeeService, Employee } from '../../core/services/employee.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss']
})
export class EmployeeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private employeeService = inject(EmployeeService);
  private toast = inject(ToastService);

  public employee = signal<Employee | null>(null);
  public certificates = signal<any[]>([]);
  public isLoading = signal<boolean>(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEmployee(parseInt(id, 10));
    }
  }

  loadEmployee(id: number): void {
    this.isLoading.set(true);
    this.employeeService.getEmployee(id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.employee.set(res.data.employee);
          this.certificates.set(res.data.certificates || []);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load employee details.');
      }
    });
  }
}

