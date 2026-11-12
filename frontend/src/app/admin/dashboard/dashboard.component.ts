import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild, PLATFORM_ID, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardSummary, ExpiringSoonCertificate, TrendStat, TypeStat } from '../../core/services/dashboard.service';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private platformId = inject(PLATFORM_ID);

  public summary = signal<DashboardSummary | null>(null);
  public expiringSoon = signal<ExpiringSoonCertificate[]>([]);
  public trend = signal<TrendStat[]>([]);
  public byType = signal<TypeStat[]>([]);
  public isLoading = signal<boolean>(true);

  @ViewChild('passFailChart') passFailCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('validityChart') validityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('issuedChart') issuedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeCanvas!: ElementRef<HTMLCanvasElement>;

  private passFailChartInstance: Chart | null = null;
  private validityChartInstance: Chart | null = null;
  private issuedChartInstance: Chart | null = null;
  private typeChartInstance: Chart | null = null;

  /** Total certificates issued across the trend window. */
  public issuedTotal = computed(() => this.trend().reduce((a, m) => a + m.issued, 0));

  /** KPI context stats */
  public inactiveEmployees = computed(() => {
    const s = this.summary();
    return s ? Math.max(0, s.totalEmployees - s.activeEmployees) : 0;
  });

  public expiredPct = computed(() => {
    const s = this.summary();
    return s && s.totalCertificates ? Math.round((s.expiredCount / s.totalCertificates) * 100) : 0;
  });

  /** KPI count-up progress (0 → 1). */
  private countP = signal<number>(0);
  private easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  public kpiEmployees = computed(() => Math.round((this.summary()?.totalEmployees || 0) * this.easeOut(this.countP())));
  public kpiCertificates = computed(() => Math.round((this.summary()?.totalCertificates || 0) * this.easeOut(this.countP())));
  public kpiValid = computed(() => Math.round((this.summary()?.validCount || 0) * this.easeOut(this.countP())));
  public kpiExpired = computed(() => Math.round((this.summary()?.expiredCount || 0) * this.easeOut(this.countP())));

  private runCountUp(): void {
    if (!isPlatformBrowser(this.platformId)) { this.countP.set(1); return; }
    const start = performance.now();
    const dur = 750;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      this.countP.set(t);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      Chart.register(...registerables);
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.dashboardService.getDashboardData().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.summary.set(res.data.summary);
          this.trend.set(res.data.trend || []);
          this.byType.set(res.data.byType || []);
          this.expiringSoon.set(res.data.expiringSoon);
          this.runCountUp();

          if (isPlatformBrowser(this.platformId)) {
            // Render charts after DOM updates
            setTimeout(() => {
              this.renderCharts(res.data.summary, res.data.trend || [], res.data.byType || []);
            }, 50);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  /** Percentage helper for chart legends. */
  pct(value: number | null | undefined, total: number | null | undefined): string {
    const v = Number(value) || 0;
    const t = Number(total) || 0;
    if (t === 0) return '0%';
    return Math.round((v / t) * 100) + '%';
  }

  private renderCharts(summary: DashboardSummary, trend: TrendStat[], byType: TypeStat[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    Chart.register(...registerables);
    this.destroyCharts();

    // Shared: donut center text (big value + caption)
    const centerText = (value: string, label: string) => ({
      id: 'centerText',
      afterDraw(chart: any) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;

        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#0F172A';
        ctx.font = '700 22px Poppins, sans-serif';
        ctx.fillText(value, x, y - 6);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 9.5px Inter, sans-serif';
        ctx.fillText(label.toUpperCase(), x, y + 13);
        ctx.restore();
      }
    });

    // Shared: wrap long labels to fit narrow chart canvases
    const wrapLabel = (text: string, max = 24): string[] => {
      if (text.length <= max) return [text];
      const lines: string[] = [];
      let cur = '';
      for (const w of text.split(' ')) {
        if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; }
        else cur = cur ? cur + ' ' + w : w;
      }
      if (cur) lines.push(cur);
      return lines.slice(0, 3);
    };

    // Shared: label above each line point (only when there is data)
    const pointValues = {
      id: 'pointValues',
      afterDatasetsDraw(chart: any) {
        const meta = chart.getDatasetMeta(0);
        const values = chart.data.datasets[0].data;
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = '#183E5D';
        meta.data.forEach((pt: any, i: number) => {
          const v = Number(values[i]) || 0;
          if (v > 0) ctx.fillText(String(v), pt.x, pt.y - 7);
        });
        ctx.restore();
      }
    };

    // Shared: styled tooltip
    const tooltipOpts = {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      titleFont: { size: 12, weight: '600' as const, family: 'Poppins' },
      bodyFont: { size: 11, family: 'Inter' },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 5,
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1
    };

    const baseOptions = (unit: string) => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipOpts,
          callbacks: {
            label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} ${unit}`
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 900,
        easing: 'easeOutQuart' as const
      }
    });

    // Shared: bar chart axis styling
    const axisTicks = { color: '#64748B', font: { size: 10, family: 'Inter' } };
    const gridColor = 'rgba(148, 163, 184, 0.16)';

    // 1. Pass / Fail Donut
    if (this.passFailCanvas?.nativeElement) {
      const ctx = this.passFailCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.passFailChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Pass', 'Fail'],
            datasets: [{
              data: [summary.passCount, summary.failCount],
              backgroundColor: ['#059669', '#E11D48'],
              hoverBackgroundColor: ['#047857', '#BE123C'],
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 8
            }]
          },
          options: baseOptions('certificates') as any,
          plugins: [centerText(this.pct(summary.passCount, summary.totalCertificates), 'pass rate')]
        });
      }
    }

    // 2. Validity Donut
    if (this.validityCanvas?.nativeElement) {
      const ctx2 = this.validityCanvas.nativeElement.getContext('2d');
      if (ctx2) {
        this.validityChartInstance = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Valid', 'Expired'],
            datasets: [{
              data: [summary.validCount, summary.expiredCount],
              backgroundColor: ['#183E5D', '#F43F5E'],
              hoverBackgroundColor: ['#102B41', '#E11D48'],
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 8
            }]
          },
          options: baseOptions('certificates') as any,
          plugins: [centerText(String(summary.validCount), 'valid')]
        });
      }
    }

    // 3. Certificates Issued — line + area (time series reads best as a line)
    if (this.issuedCanvas?.nativeElement) {
      const ctx3 = this.issuedCanvas.nativeElement.getContext('2d');
      if (ctx3) {
        const area = ctx3.createLinearGradient(0, 0, 0, 170);
        area.addColorStop(0, 'rgba(24, 62, 93, 0.28)');
        area.addColorStop(1, 'rgba(24, 62, 93, 0.02)');

        this.issuedChartInstance = new Chart(ctx3, {
          type: 'line',
          data: {
            labels: trend.map(m => m.label),
            datasets: [{
              label: 'Issued',
              data: trend.map(m => m.issued),
              borderColor: '#183E5D',
              borderWidth: 2,
              backgroundColor: area,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#183E5D',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipOpts,
                callbacks: {
                  label: (ctx: any) => ` Issued: ${ctx.parsed.y}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                  ...axisTicks,
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 12
                }
              },
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                border: { display: false },
                ticks: {
                  color: '#94A3B8',
                  font: { size: 10, family: 'Inter' },
                  precision: 0,
                  maxTicksLimit: 4,
                  padding: 4
                }
              }
            },
            animation: { duration: 900, easing: 'easeOutQuart' }
          } as any,
          plugins: [pointValues]
        });
      }
    }

    // 4. Certificates by Type — horizontal bar
    if (this.typeCanvas?.nativeElement) {
      const ctx4 = this.typeCanvas.nativeElement.getContext('2d');
      if (ctx4) {
        this.typeChartInstance = new Chart(ctx4, {
          type: 'bar',
          data: {
            labels: byType.map(t => t.name),
            datasets: [{
              label: 'Certificates',
              data: byType.map(t => t.total),
              backgroundColor: ['#183E5D', '#23557E', '#3B7CB0'],
              hoverBackgroundColor: ['#102B41', '#1A4161', '#2F6694'],
              borderRadius: 5,
              maxBarThickness: 14
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipOpts,
                callbacks: {
                  label: (ctx: any) => ` ${ctx.parsed.x} certificates`
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: gridColor },
                border: { display: false },
                ticks: {
                  color: '#94A3B8',
                  font: { size: 10, family: 'Inter' },
                  precision: 0,
                  maxTicksLimit: 6
                }
              },
              y: {
                grid: { display: false },
                border: { display: false },
                // Reserve enough width for wrapped type names so they never clip
                afterFit: (scale: any) => {
                  scale.width = Math.max(scale.width, 150);
                },
                ticks: {
                  color: '#475569',
                  font: { size: 10, family: 'Inter' },
                  autoSkip: false,
                  padding: 6,
                  callback: function (this: any, value: any) {
                    return wrapLabel(this.getLabelForValue(value));
                  }
                }
              }
            },
            animation: { duration: 900, easing: 'easeOutQuart' }
          } as any
        });
      }
    }
  }

  private destroyCharts(): void {
    if (this.passFailChartInstance) {
      this.passFailChartInstance.destroy();
      this.passFailChartInstance = null;
    }
    if (this.validityChartInstance) {
      this.validityChartInstance.destroy();
      this.validityChartInstance = null;
    }
    if (this.issuedChartInstance) {
      this.issuedChartInstance.destroy();
      this.issuedChartInstance = null;
    }
    if (this.typeChartInstance) {
      this.typeChartInstance.destroy();
      this.typeChartInstance = null;
    }
  }
}
