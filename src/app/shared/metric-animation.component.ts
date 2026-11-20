import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

@Component({
  selector: 'app-metric-animation',
  templateUrl: './metric-animation.component.html',
  styleUrl: './metric-animation.component.scss',
  host: { 'aria-hidden': 'true', '[class.entered]': 'entered()' },
})
export class MetricAnimationComponent {
  kind = input.required<'pnl' | 'trades' | 'rate' | 'ratio'>();
  pnl = input(0);
  rate = input<number | null>(null);
  wins = input(0);
  losses = input(0);
  entered = signal(false);
  balanceTilt = computed(() => this.wins() === this.losses() ? 0 : this.wins() > this.losses() ? -8 : 8);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    afterNextRender(() => {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0)) {
          this.entered.set(true);
          observer.disconnect();
        }
      }, { threshold: 0.4 });
      observer.observe(this.element.nativeElement);
      this.destroy.onDestroy(() => observer.disconnect());
    });
  }
}
