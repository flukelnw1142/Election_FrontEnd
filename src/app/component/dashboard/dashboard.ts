import { Component, OnInit } from '@angular/core';
import { ElectionService } from '../../service/election.service';
import { SafePipe } from '../../pipes/safe.pipe';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [SafePipe, CommonModule, HttpClientModule]
})
export class Dashboard implements OnInit {
  svgContent: string = '';

  private provinceIdMap: { [province: string]: string } = {
    'chiangrai': 'TH57',
    'phayao': 'TH56',
    'prachuapkhirikhan': 'TH77'
  };

  constructor(private electionService: ElectionService, private http: HttpClient) { }

  ngOnInit(): void {
    const provinces = ['chiangrai', 'phayao', 'prachuapkhirikhan'];
    const observables = provinces.map(p => this.electionService.getConstituencies(p));
    forkJoin(observables).subscribe(constResults => {
      const provinceConstituencies: { [province: string]: { [constituency: string]: string } } = provinces.reduce<{ [province: string]: { [constituency: string]: string } }>((acc, p, i) => {
        acc[p] = constResults[i];
        return acc;
      }, {});
      
      this.electionService.getResults().subscribe(provinceWinners => {
        this.http.get('/assets/thailand.svg', { responseType: 'text' }).subscribe(svgText => {
          let newSvg = svgText;
          for (const province in provinceWinners) {
            const winner = provinceWinners[province];
            const id = this.provinceIdMap[province.toLowerCase().replace(/ /g, '')];
            const color = this.getColor(winner);
            if (id) {
              console.log(`Coloring #${id} with ${color}`);
              // Force inline fill and stroke for circle
              newSvg = newSvg.replace(new RegExp(`(<circle[^>]*id="${id}"[^>]*)(>)`, 'g'), `$1 fill="${color}" stroke="black" stroke-width="1"$2`);

              // Extract cx and cy
              const circleMatch = newSvg.match(new RegExp(`<circle[^>]*id="${id}"[^>]*>`));
              if (circleMatch) {
                const circleStr = circleMatch[0];
                const cxMatch = circleStr.match(/cx="([^"]+)"/);
                const cyMatch = circleStr.match(/cy="([^"]+)"/);
                const cx = cxMatch ? cxMatch[1] : '0';
                const cy = cyMatch ? cyMatch[1] : '0';

                // Get results for this province
                const results = provinceConstituencies[province];
                const numHex = Object.keys(results).length;
                const hexFragment = this.genHexagonFragment(results, numHex);

                // Insert the hexagon group after the specific circle
                const openTagRegex = new RegExp(`<circle[^>]*id="${id}"[^>]*>`, 'g');
                const fullCircleRegex = new RegExp(`(<circle[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(</circle>)`, 'g');
                newSvg = newSvg.replace(fullCircleRegex, `$1$2$3<g transform="translate(${cx}, ${cy}) scale(0.1)">${hexFragment}</g>`);
              }
            }
          }
          this.svgContent = newSvg;
        });
      });
    });
  }

  private genHexagonFragment(results: { [constituency: string]: string }, numHex: number): string {
    let hexes = '';
    const hexSize = 50;
    let row = 0;
    let col = 0;
    const constituencies = Object.keys(results).sort((a, b) => parseInt(a) - parseInt(b));
    constituencies.forEach(constituency => {
      const x = col * hexSize * 1.5;
      const y = row * hexSize * 1.75 + (col % 2 === 1 ? hexSize : 0);
      const color = this.getColor(results[constituency]);

      hexes += `<polygon class="hex" id="hex${constituency}" points="${x + hexSize},${y} ${x + hexSize / 2},${y - hexSize * 0.866} ${x - hexSize / 2},${y - hexSize * 0.866} ${x - hexSize},${y} ${x - hexSize / 2},${y + hexSize * 0.866} ${x + hexSize / 2},${y + hexSize * 0.866}" fill="${color}" />`;
      hexes += `<text x="${x}" y="${y + 5}">${constituency}</text>`;

      col++;
      if (col > 3) {
        col = 0;
        row++;
      }
    });

    return `
      <style>
        .hex { cursor: pointer; transition: fill 0.3s; stroke: white; stroke-width: 2; }
        .hex:hover { fill: yellow !important; }
        text { fill: white; font-size: 14px; text-anchor: middle; dominant-baseline: central; }
      </style>
      ${hexes}
    `;
  }

  private getColor(winner: string): string {
    if (winner.includes('ก้าวไกล')) return 'orange';
    if (winner.includes('เพื่อไทย')) return 'red';
    if (winner.includes('ภูมิใจไทย')) return 'blue';
    if (winner.includes('พลังประชารัฐ')) return 'green';
    if (winner.includes('ประชาธิปัตย์')) return 'purple';
    if (winner.includes('รวมไทยสร้างชาติ')) return 'brown';
    return 'gray';
  }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;
    if (target.classList.contains('hex') && target.id) {
      const hexId = target.id.replace('hex', '');
      alert(`คลิกเขต: ${hexId}`);
    } else if (target.id) {
      const province = Object.keys(this.provinceIdMap).find(key => this.provinceIdMap[key] === target.id) || 'ไม่ทราบ';
      alert(`คลิกจังหวัด: ${province}`);
    }
  }
}