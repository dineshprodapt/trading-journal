import { Component } from '@angular/core';
import { tradingRulesConfig } from '../core/trading-rules.config';

@Component({
  selector: 'app-trading-rules',
  templateUrl: './trading-rules.component.html',
  styleUrl: './trading-rules.component.scss',
})
export class TradingRulesComponent {
  readonly config = tradingRulesConfig;
}
