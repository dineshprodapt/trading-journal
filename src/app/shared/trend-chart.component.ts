import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
@Component({
  selector: 'app-trend-chart',
  template:
    '<div class="chart-frame"><canvas #canvas role="img" [attr.aria-label]="title()">{{title()}}. Values are also available in the tables below.</canvas></div>',
})
export class TrendChartComponent implements OnDestroy {
  labels = input.required<string[]>();
  values = input.required<number[]>();
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
      if (this.mounted) this.draw();
    });
  }
  draw() {
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, {
      type: this.kind(),
      data: {
        labels: this.labels(),
        datasets: [
          {
            label: this.title(),
            data: this.values().map((n) => n / 100),
            borderColor:
              this.kind() === 'line'
                ? '#146b59'
                : this.values().map((n) => (n < 0 ? '#c35258' : '#146b59')),
            backgroundColor:
              this.kind() === 'line'
                ? 'rgba(20,107,89,.09)'
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
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) =>
                new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                  Number(c.raw),
                ),
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: this.kind() === 'bar' ? 'Month' : 'Date' },
            grid: { display: false },
            ticks: { maxTicksLimit: 8 },
          },
          y: {
            title: { display: true, text: 'P&L (₹)' },
            beginAtZero: true,
            ticks: {
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
