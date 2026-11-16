import { Component, inject, OnInit, signal, computed, effect, untracked, ElementRef, ViewChild, PLATFORM_ID, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardSummary, ExpiringSoonCertificate, PendingApprovalCertificate, TrendStat, TypeStat } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { CertificateService } from '../../core/services/certificate.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
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
  private certService = inject(CertificateService);
  private toast = inject(ToastService);
  private theme = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);

  public auth = inject(AuthService);

  constructor() {
    effect(() => {
      const _dark = this.theme.isDark();
      untracked(() => {
        const s = this.summary();
        if (isPlatformBrowser(this.platformId) && s && !this.isLoading()) {
          setTimeout(() => this.renderCharts(s, this.trend(), this.byType()), 20);
        }
      });
    });
  }

  public summary = signal<DashboardSummary | null>(null);
  public expiringSoon = signal<ExpiringSoonCertificate[]>([]);
  public pendingApproval = signal<PendingApprovalCertificate[]>([]);
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
  private countUpRafId: number | null = null;

  /** Total certificates issued across the trend window. */
  public issuedTotal = computed(() => this.trend().reduce((a, m) => a + m.issued, 0));

  /** Maximum count among scopes for relative bar width scaling. */
  public maxScopeTotal = computed(() => {
    const list = this.byType();
    if (!list.length) return 1;
    return Math.max(1, ...list.map(i => Number(i.total) || 0));
  });

  public scopeWidthPct(total: number): number {
    const max = this.maxScopeTotal();
    return Math.max(6, Math.min(100, Math.round(((Number(total) || 0) / max) * 100)));
  }

  public formatCompact(val: number | null | undefined): string {
    const n = Number(val) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  /** KPI context stats */
  public inactiveEmployees = computed(() => {
    const s = this.summary();
    return s ? Math.max(0, s.totalEmployees - s.activeEmployees) : 0;
  });

  public nonPassCount = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return (s.failCount || 0) + (s.otherStatusCount || 0);
  });

  public passedCertificatesTotal = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return (s.validCount || 0) + (s.expiredCount || 0);
  });

  public expiredPct = computed(() => {
    const s = this.summary();
    const denom = this.passedCertificatesTotal() || s?.totalCertificates || 0;
    return s && denom ? Math.round((s.expiredCount / denom) * 100) : 0;
  });

  /** Certificates waiting for a certification manager's approval. */
  public pendingApprovalCount = computed(() => {
    const fromSummary = this.summary()?.pendingApprovalCount;
    if (typeof fromSummary === 'number') return fromSummary;
    return this.pendingApproval().length;
  });

  /** Smooth, slow KPI count-up progress (0 → 1 over 1.85s). */
  private countP = signal<number>(0);
  private easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
  public kpiEmployees = computed(() => Math.round((this.summary()?.totalEmployees || 0) * this.easeOutQuart(this.countP())));
  public kpiCertificates = computed(() => Math.round((this.summary()?.totalCertificates || 0) * this.easeOutQuart(this.countP())));
  public kpiValid = computed(() => Math.round((this.summary()?.validCount || 0) * this.easeOutQuart(this.countP())));
  public kpiExpired = computed(() => Math.round((this.summary()?.expiredCount || 0) * this.easeOutQuart(this.countP())));

  private runCountUp(): void {
    if (!isPlatformBrowser(this.platformId)) { this.countP.set(1); return; }
    if (this.countUpRafId !== null) {
      cancelAnimationFrame(this.countUpRafId);
      this.countUpRafId = null;
    }
    const start = performance.now();
    const dur = 1850;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      this.countP.set(t);
      if (t < 1) {
        this.countUpRafId = requestAnimationFrame(tick);
      } else {
        this.countUpRafId = null;
      }
    };
    this.countUpRafId = requestAnimationFrame(tick);
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
    if (this.countUpRafId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.countUpRafId);
      this.countUpRafId = null;
    }
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
          this.pendingApproval.set(res.data.pendingApproval || res.data.pendingApprovals || []);
          this.runCountUp();

          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
              this.renderCharts(res.data.summary, res.data.trend || [], res.data.byType || []);
            }, 60);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  approveCert(cert: PendingApprovalCertificate): void {
    if (!this.auth.isManager()) return;
    this.certService.approveCertificate(cert.id).subscribe({
      next: () => {
        this.toast.success(`Certificate ${cert.certificate_number} approved.`);
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to approve certificate.');
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

    const isDark = this.theme.isDark();

    const formatK = (n: number): string => {
      if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(n);
    };

    // Shared: donut center text with animated count-up during sweep
    const centerText = (targetNumber: number, suffix: string, isCompact: boolean, label: string) => {
      const startTime = performance.now();
      const animDur = 2000;
      return {
        id: 'centerText',
        afterDraw(chart: any) {
          const { ctx, chartArea } = chart;
          if (!chartArea || !ctx) return;
          const meta = chart.getDatasetMeta(0);
          if (!meta?.data?.length) return;

          const elapsed = Math.min(1, (performance.now() - startTime) / animDur);
          const eased = 1 - Math.pow(1 - elapsed, 4);
          const currentVal = Math.round(targetNumber * eased);
          const displayStr = isCompact ? formatK(currentVal) : `${currentVal}${suffix}`;

          const x = (chartArea.left + chartArea.right) / 2;
          const y = (chartArea.top + chartArea.bottom) / 2;
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillStyle = isDark ? '#F8FAFC' : '#1E1B4B';
          ctx.font = '700 22px Poppins, sans-serif';
          ctx.fillText(displayStr, x, y - 6);

          ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
          ctx.font = '600 9.5px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), x, y + 13);
          ctx.restore();
        }
      };
    };

    // Shared: styled glassmorphic dark tooltip
    const tooltipOpts = {
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      titleFont: { size: 12, weight: '600' as const, family: 'Poppins' },
      bodyFont: { size: 11, family: 'Inter' },
      padding: 11,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 5,
      borderColor: 'rgba(99, 102, 241, 0.35)',
      borderWidth: 1
    };

    const baseDonutOptions = (unit: string, isEmpty = false) => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipOpts,
          enabled: !isEmpty,
          callbacks: {
            label: (ctx: any) => ` ${ctx.label}: ${Number(ctx.parsed).toLocaleString()} ${unit}`
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 2100,
        easing: 'easeInOutQuart' as const
      }
    });

    const axisTicks = { color: isDark ? '#94A3B8' : '#64748B', font: { size: 10, family: 'Inter' } };
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)';
    const donutBorderColor = isDark ? '#111827' : '#ffffff';
    const donutEmptyColor = isDark ? '#1E293B' : '#E2E8F4';

    // 1. Pass / Fail Donut (Slow 2.1s Rotational Sweep + Scale, with zero-data guard)
    if (this.passFailCanvas?.nativeElement) {
      const ctx = this.passFailCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const otherCount = summary.otherStatusCount || 0;
        const rawData = otherCount > 0
          ? [summary.passCount || 0, summary.failCount || 0, otherCount]
          : [summary.passCount || 0, summary.failCount || 0];
        const isEmpty = rawData.every(v => v <= 0);

        const labels = isEmpty
          ? ['No Data']
          : (otherCount > 0 ? ['Pass', 'Fail', 'Withdrawn / Withheld'] : ['Pass', 'Fail']);
        const data = isEmpty ? [1] : rawData;
        const bgColors = isEmpty
          ? [donutEmptyColor]
          : (otherCount > 0 ? ['#10B981', '#F43F5E', '#F59E0B'] : ['#10B981', '#F43F5E']);
        const hoverColors = isEmpty
          ? [donutEmptyColor]
          : (otherCount > 0 ? ['#059669', '#E11D48', '#D97706'] : ['#059669', '#E11D48']);

        const passPctNum = summary.totalCertificates > 0
          ? Math.round((summary.passCount / summary.totalCertificates) * 100)
          : 0;

        this.passFailChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data,
              backgroundColor: bgColors,
              hoverBackgroundColor: hoverColors,
              borderWidth: isEmpty ? 0 : 3,
              borderColor: donutBorderColor,
              hoverOffset: isEmpty ? 0 : 9
            }]
          },
          options: baseDonutOptions('certificates', isEmpty) as any,
          plugins: [centerText(passPctNum, '%', false, 'pass rate')]
        });
      }
    }

    // 2. Validity Donut (Slow 2.1s Rotational Sweep + Scale, with zero-data guard)
    if (this.validityCanvas?.nativeElement) {
      const ctx2 = this.validityCanvas.nativeElement.getContext('2d');
      if (ctx2) {
        const rawValidData = [summary.validCount || 0, summary.expiredCount || 0];
        const isEmptyValid = rawValidData.every(v => v <= 0);

        this.validityChartInstance = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: isEmptyValid ? ['No Data'] : ['Valid', 'Expired'],
            datasets: [{
              data: isEmptyValid ? [1] : rawValidData,
              backgroundColor: isEmptyValid ? [donutEmptyColor] : ['#4F46E5', '#F43F5E'],
              hoverBackgroundColor: isEmptyValid ? [donutEmptyColor] : ['#4338CA', '#E11D48'],
              borderWidth: isEmptyValid ? 0 : 3,
              borderColor: donutBorderColor,
              hoverOffset: isEmptyValid ? 0 : 9
            }]
          },
          options: baseDonutOptions('certificates', isEmptyValid) as any,
          plugins: [centerText(summary.validCount || 0, '', true, 'valid')]
        });
      }
    }

    // 3. Certificates Issued — Self-Drawing Progressive Line + Area Graph (2.4s left-to-right trace)
    if (this.issuedCanvas?.nativeElement) {
      const ctx3 = this.issuedCanvas.nativeElement.getContext('2d');
      if (ctx3) {
        const drawStart = performance.now();
        const drawDuration = 2400;
        const easeInOutCubic = (t: number) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const drawState = { progress: 0 };

        const progressiveSelfDrawPlugin = {
          id: 'progressiveSelfDraw',
          beforeDatasetsDraw(chart: any) {
            const { ctx: c, chartArea } = chart;
            if (!chartArea || !c) return;
            const rawT = Math.min(1, Math.max(0, (performance.now() - drawStart) / drawDuration));
            drawState.progress = Math.max(drawState.progress, easeInOutCubic(rawT));

            c.save();
            const totalW = Math.max(0, chartArea.right - chartArea.left);
            const clipW = Math.max(0, totalW * drawState.progress);
            c.beginPath();
            c.rect(chartArea.left - 8, chartArea.top - 28, clipW + 16, (chartArea.bottom - chartArea.top) + 40);
            c.clip();
          },
          afterDatasetsDraw(chart: any) {
            const { ctx: c, chartArea } = chart;
            if (!chartArea || !c) return;
            c.restore();

            const meta = chart.getDatasetMeta(0);
            const rawValues: number[] = (chart.data.datasets[0]?.data || []).map((v: any) => Number(v) || 0);
            if (!meta?.data?.length || !rawValues.length) return;

            const totalW = Math.max(0, chartArea.right - chartArea.left);
            const clipRightX = chartArea.left + totalW * drawState.progress;

            // Draw glowing leading pen head while the curve is actively drawing itself
            if (drawState.progress > 0.02 && drawState.progress < 0.995 && meta.data.length > 1) {
              let tipX = meta.data[0].x;
              let tipY = meta.data[0].y;
              for (let i = 0; i < meta.data.length - 1; i++) {
                const p0 = meta.data[i];
                const p1 = meta.data[i + 1];
                if (!p0 || !p1 || !Number.isFinite(p0.x) || !Number.isFinite(p1.x)) continue;
                if (clipRightX >= p0.x && clipRightX <= p1.x) {
                  const segT = p1.x > p0.x ? (clipRightX - p0.x) / (p1.x - p0.x) : 0;
                  tipX = clipRightX;
                  tipY = p0.y + (p1.y - p0.y) * segT;
                  break;
                } else if (clipRightX > p1.x) {
                  tipX = p1.x;
                  tipY = p1.y;
                }
              }

              if (Number.isFinite(tipX) && Number.isFinite(tipY)) {
                c.save();
                const glow = c.createRadialGradient(tipX, tipY, 1, tipX, tipY, 14);
                glow.addColorStop(0, 'rgba(99, 102, 241, 0.65)');
                glow.addColorStop(0.5, 'rgba(14, 165, 233, 0.25)');
                glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
                c.fillStyle = glow;
                c.beginPath();
                c.arc(tipX, tipY, 14, 0, Math.PI * 2);
                c.fill();

                c.fillStyle = '#4F46E5';
                c.beginPath();
                c.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
                c.fill();
                c.strokeStyle = '#FFFFFF';
                c.lineWidth = 2;
                c.stroke();
                c.restore();
              }
            }

            // Pick key non-colliding point pills using actual pixel distance (>= 42px) so pills never overlap
            const nonZeroIndices = rawValues.map((v, idx) => (v > 0 ? idx : -1)).filter(idx => idx >= 0);
            if (!nonZeroIndices.length) return;

            const firstIdx = nonZeroIndices[0];
            const lastIdx = nonZeroIndices[nonZeroIndices.length - 1];
            let peakIdx = firstIdx;
            for (const idx of nonZeroIndices) {
              if (rawValues[idx] > rawValues[peakIdx]) peakIdx = idx;
            }

            const chosen: number[] = [peakIdx];
            const canAddPoint = (candidateIdx: number, minPixelGap = 42): boolean => {
              const candPt = meta.data[candidateIdx];
              if (!candPt || !Number.isFinite(candPt.x)) return false;
              return chosen.every(existingIdx => {
                const exPt = meta.data[existingIdx];
                if (!exPt || !Number.isFinite(exPt.x)) return true;
                return Math.abs(candPt.x - exPt.x) >= minPixelGap && Math.abs(candidateIdx - existingIdx) >= 2;
              });
            };

            if (canAddPoint(firstIdx, 38)) chosen.push(firstIdx);
            if (canAddPoint(lastIdx, 38)) chosen.push(lastIdx);
            for (const idx of nonZeroIndices) {
              if (canAddPoint(idx, 46)) chosen.push(idx);
            }

            c.save();
            c.font = '700 9.5px Inter, sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';

            Array.from(chosen).forEach((i) => {
              const pt = meta.data[i];
              const v = rawValues[i];
              if (!pt || v <= 0 || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
              if (clipRightX < pt.x - 4) return;
              const pillProgress = Math.min(1, Math.max(0, (clipRightX - (pt.x - 4)) / 24));

              const label = formatK(v);
              const textW = c.measureText(label).width;
              const padX = 5.5;
              const pillW = textW + padX * 2;
              const pillH = 15;
              const pillX = Math.max(chartArea.left + 2, Math.min(chartArea.right - pillW - 2, pt.x - pillW / 2));
              const slideY = (1 - pillProgress) * 6;
              const pillY = Math.max(chartArea.top + 2, pt.y - pillH - 6 + slideY);

              c.globalAlpha = pillProgress;
              c.fillStyle = i === peakIdx ? '#4F46E5' : (isDark ? 'rgba(99, 102, 241, 0.24)' : '#EEF2FF');
              c.beginPath();
              if (typeof c.roundRect === 'function') {
                c.roundRect(pillX, pillY, pillW, pillH, 4);
              } else {
                c.rect(pillX, pillY, pillW, pillH);
              }
              c.fill();

              c.fillStyle = i === peakIdx ? '#FFFFFF' : (isDark ? '#C7D2FE' : '#4338CA');
              c.fillText(label, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
            });
            c.restore();

            // Interactive vertical crosshair on hover
            const activeEls = chart.getActiveElements?.() || [];
            if (activeEls.length > 0) {
              const activePt = activeEls[0]?.element;
              if (activePt && Number.isFinite(activePt.x)) {
                c.save();
                c.beginPath();
                c.setLineDash([3, 3]);
                c.moveTo(activePt.x, chartArea.top);
                c.lineTo(activePt.x, chartArea.bottom);
                c.strokeStyle = 'rgba(79, 70, 229, 0.35)';
                c.lineWidth = 1.2;
                c.stroke();
                c.restore();
              }
            }
          }
        };

        this.issuedChartInstance = new Chart(ctx3, {
          type: 'line',
          data: {
            labels: trend.map(m => m.label),
            datasets: [{
              label: 'Issued',
              data: trend.map(m => m.issued),
              borderColor: (context: any) => {
                const { ctx: c, chartArea } = context.chart;
                if (!chartArea) return '#4F46E5';
                const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                g.addColorStop(0, '#4338CA');
                g.addColorStop(0.55, '#6366F1');
                g.addColorStop(1, '#0EA5E9');
                return g;
              },
              borderWidth: 2.8,
              backgroundColor: (context: any) => {
                const { ctx: c, chartArea } = context.chart;
                if (!chartArea) return 'rgba(79, 70, 229, 0.18)';
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, 'rgba(79, 70, 229, 0.34)');
                g.addColorStop(0.55, 'rgba(14, 165, 233, 0.12)');
                g.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
                return g;
              },
              fill: true,
              tension: 0.4,
              pointBackgroundColor: isDark ? '#111827' : '#ffffff',
              pointBorderColor: '#4F46E5',
              pointBorderWidth: 2,
              pointRadius: 3.5,
              pointHoverRadius: 6.5,
              pointHoverBackgroundColor: '#F59E0B',
              pointHoverBorderColor: '#4338CA',
              pointHoverBorderWidth: 2.5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false
            },
            layout: {
              padding: { top: 22, right: 8, left: 2, bottom: 0 }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipOpts,
                callbacks: {
                  label: (ctx: any) => ` Issued: ${Number(ctx.parsed.y).toLocaleString()} certificates`
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
                  maxTicksLimit: 6
                }
              },
              y: {
                beginAtZero: true,
                grace: '15%',
                grid: { color: gridColor },
                border: { display: false },
                ticks: {
                  color: '#94A3B8',
                  font: { size: 10, family: 'Inter' },
                  precision: 0,
                  maxTicksLimit: 4,
                  padding: 4,
                  callback: (val: any) => formatK(Number(val) || 0)
                }
              }
            },
            animation: {
              duration: 2400,
              easing: 'easeOutQuart',
              onComplete: () => {
                drawState.progress = 1;
              }
            }
          } as any,
          plugins: [progressiveSelfDrawPlugin]
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
