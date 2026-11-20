import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-reflection-animation',
  templateUrl: './reflection-animation.component.html',
  styleUrl: './reflection-animation.component.scss',
})
export class ReflectionAnimationComponent {
  paused = signal(false);
}
