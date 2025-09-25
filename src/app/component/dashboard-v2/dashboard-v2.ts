import {
  Component,
  Inject,
  PLATFORM_ID,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard-v2',
  standalone: true,
  templateUrl: './dashboard-v2.html',
  styleUrls: ['./dashboard-v2.scss'],
})
export class DashboardV2 implements OnInit {
  svgContent: SafeHtml | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadSvg();
    }
  }

  async loadSvg() {
    console.log('>> SVG Loaded _V2');
    try {
      const rawSvg = await firstValueFrom(
        this.http.get('assets/halfCircle500.svg', { responseType: 'text' })
      );

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(rawSvg, 'image/svg+xml');
      const svg = svgDoc.documentElement;

      svg.setAttribute('width', '1000');
      svg.setAttribute('height', '800');

      for (let i = 1; i <= 500; i++) {
        const circle = svg.querySelector(`#circle-${i}`);
        if (circle) {
          let fill = 'gray';
          if (i <= 120) fill = 'orange';
          else if (i <= 260) fill = 'red';
          else if (i <= 280) fill = 'blue';
          circle.setAttribute('fill', fill);
        }
      }

      const serializer = new XMLSerializer();
      const modifiedSvg = serializer.serializeToString(svg);
      this.svgContent = this.sanitizer.bypassSecurityTrustHtml(modifiedSvg);

      setTimeout(() => {
        this.cdr.markForCheck();
      }, 0);
    } catch (e) {
      console.error('❌ SVG Load Error:', e);
    }
  }

}
