import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
import { ThemeService } from '../core/theme.service';
@Component({
  selector: 'app-trend-chart',
  template:
    '<div class="chart-frame"><canvas #canvas role="img" [attr.aria-label]="title()">{{title()}}. Values are also available in the tables below.</canvas></div>',
})
export class TrendChartComponent implements OnDestroy {
  private readonly theme = inject(ThemeService);
  labels = input.required<string[]>();
  values = input.required<number[]>();
  percentages = input<(number | null)[]>([]);
  kind = input<'bar' | 'line'>('line');
  title = input('Profit / loss');
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  chart?: Chart;
  mounted = false;
  constructor() {
    afterNextRender(() => {
      this.mounted = true;
      this.draw();
    });
    effect(() => {
      this.labels();
      this.values();
      this.percentages();
      this.theme.theme();
      if (this.mounted) this.draw();
    });
  }
  draw() {
    const dark = this.theme.theme() === 'dark';
    const foreground = dark ? '#b9cec0' : '#697c77';
    const positive = dark ? '#80d2b1' : '#146b59';
    const percentages = this.percentages();
    const showPercentages = () => percentages.length > 0 && !window.matchMedia('(max-width: 767px)').matches;
    const formatPercent = (value: number) =>
      `${value > 0 ? '+' : ''}${value.toFixed(0)}%`;
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, {
      type: this.kind(),
      plugins: [{
        id: 'monthly-return-labels',
        beforeLayout: (chart) => {
          const visible = showPercentages();
          chart.options.layout!.padding = { top: visible ? 18 : 0, bottom: visible ? 18 : 0 };
          const yAxis = chart.options.scales?.['y'];
          if (yAxis?.type === 'linear') yAxis.grace = visible ? '10%' : 0;
        },
        afterDatasetsDraw: (chart) => {
          if (this.kind() !== 'bar' || !showPercentages()) return;
          const { ctx } = chart;
          const bars = chart.getDatasetMeta(0).data;
          const slotWidth = chart.chartArea.width / Math.max(bars.length, 1);
          ctx.save();
          ctx.font = '500 10px sans-serif';
          ctx.textAlign = 'center';
          bars.forEach((bar, index) => {
            const percent = percentages[index];
            if (percent === null || percent === undefined) return;
            const negative = percent < 0;
            ctx.fillStyle = negative ? '#e5838b' : foreground;
            ctx.textBaseline = negative ? 'top' : 'bottom';
            // Keep a fixed gap and contain text within its own category slot.
            ctx.fillText(formatPercent(percent), bar.x, bar.y + (negative ? 8 : -8), Math.max(1, slotWidth - 6));
          });
          ctx.restore();
        },
      }],
      data: {
        labels: this.labels(),
        datasets: [
          {
            label: this.title(),
            data: this.values().map((n) => n / 100),
            borderColor:
              this.kind() === 'line'
                ? positive
                : this.values().map((n) => (n < 0 ? '#e5838b' : positive)),
            backgroundColor:
              this.kind() === 'line'
                ? (dark ? 'rgba(128,210,177,.12)' : 'rgba(20,107,89,.09)')
                : this.values().map((n) => (n < 0 ? '#d96b70' : '#288773')),
            borderWidth: 2,
            fill: this.kind() === 'line',
            pointRadius: 3,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 0, bottom: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (c) => {
                if (!showPercentages()) return '';
                const percent = percentages[c.dataIndex];
                return percent === null || percent === undefined
                  ? 'Monthly return: unavailable'
                  : `Monthly return: ${formatPercent(percent)}`;
              },
              label: (c) =>
                new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  Number(c.raw),
                ),
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: this.kind() === 'bar' ? 'Month' : 'Date', color: foreground },
            grid: { display: false },
            ticks: { maxTicksLimit: 8, color: foreground },
          },
          y: {
            type: 'linear',
            title: { display: true, text: 'P&L (₹)', color: foreground },
            grid: { color: dark ? '#344b40' : '#e0e8e4' },
            beginAtZero: true,
            grace: 0,
            ticks: {
              color: foreground,
              callback: (value) =>
                '₹' + new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(Number(value)),
            },
          },
        },
      },
    });
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
}
