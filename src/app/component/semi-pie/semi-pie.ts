import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';


Chart.register(...registerables);

@Component({
  selector: 'app-semi-pie',
  imports: [CommonModule],
  templateUrl: './semi-pie.html',
  styleUrl: './semi-pie.scss'
})
export class SemiPie implements AfterViewInit, OnChanges {

  @Input() agree = 0;
  @Input() disagree = 0;
  @Input() question!: {
    agreePercent: number;
    agreeScore: number;
    disagreePercent: number;
    disagreeScore: number;
    showGuideLine: boolean;
  };
  @Input() fullWidth = false;
  @Input() theme: 'total' | 'foreign' = 'total';




  chart!: Chart;
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;


  ngAfterViewInit(): void {
    this.createChart();
  }

  // ngOnChanges(changes: SimpleChanges): void {

  //   if (this.chart) {
  //     this.chart.data.datasets[0].data = [this.agree, this.disagree];
  //     this.chart.update();
  //   }
  // }

  ngOnChanges(): void {
    if (this.chart) {
      this.chart.destroy();
      this.createChart();
    }
  }


  createChart() {
    /**
     * 1
     */
    // const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    // const chartCtx = ctx.getContext('2d');
    const chartCtx = this.pieCanvas.nativeElement.getContext('2d');
    if (!chartCtx) {
      return;
    }

    let agreeGradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    let disagreeGradient = chartCtx.createLinearGradient(0, 0, 0, 300);

    if (this.theme === 'total') {
      // โทนเขียว-แดง (ทั้งหมด)
      agreeGradient.addColorStop(0, '#66BB6A');
      agreeGradient.addColorStop(1, '#2E7D32');

      disagreeGradient.addColorStop(0, '#EF5350');
      disagreeGradient.addColorStop(1, '#B71C1C');
    } else {
      // โทนม่วง-ส้ม (นอกประเทศ)
      agreeGradient.addColorStop(0, '#9a49a9');
      agreeGradient.addColorStop(1, '#6d2897');

      disagreeGradient.addColorStop(0, '#b83a3a');
      disagreeGradient.addColorStop(1, '#a92020');
    }

    const isEmpty = this.agree === 0 && this.disagree === 0;

    const emptyGradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    emptyGradient.addColorStop(0, '#F5F5F5');
    emptyGradient.addColorStop(1, '#E0E0E0');


    this.chart = new Chart(chartCtx, {
      type: 'pie',
      data: {
        labels: isEmpty ? ['ยังไม่มีข้อมูล'] : ['เห็นด้วย', 'ไม่เห็นด้วย'],
        // labels: ['เห็นด้วย', 'ไม่เห็นด้วย'],
        datasets: [{
          // data: [this.agree, this.disagree],
          data: isEmpty ? [100] : [this.agree, this.disagree],
          backgroundColor: isEmpty
            ? [emptyGradient]
            : [agreeGradient, disagreeGradient],
          // backgroundColor: [agreeGradient, disagreeGradient],
          borderWidth: 0,
          // hoverOffset: 18
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false   // ซ่อน legend
          },
          tooltip: {
            enabled: !isEmpty,
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}%`
            },
            titleFont: {
              family: 'Kanit',
              size: 16,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Kanit',
              size: 14
            },
            footerFont: {
              family: 'Kanit',
              size: 12
            },
            padding: 12,
            boxPadding: 6
          }
        },

      },
    });


    /**
     * 2
     */
    // this.chart = new Chart('barChart', {
    //   type: 'bar',
    //   data: {
    //     labels: ['เห็นด้วย', 'ไม่เห็นด้วย'],
    //     datasets: [{
    //       data: [this.agree, this.disagree],
    //       backgroundColor: ['#4CAF50', '#F44336'],
    //       borderRadius: 6,
    //       barThickness: 70,
    //       maxBarThickness: 80,
    //     }]
    //   },
    //   options: {
    //     responsive: true,
    //     plugins: {
    //       legend: {
    //         display: false
    //       },
    //       tooltip: {
    //         callbacks: {
    //           label: (context) => `${context.parsed.y}%`
    //         }
    //       }
    //     },
    //     scales: {
    //       x: {
    //         ticks: {
    //           display: false
    //         },
    //         grid: {
    //           display: false
    //         }
    //       },
    //       y: {
    //         beginAtZero: true,
    //         max: 100,
    //         ticks: {
    //           callback: (value) => value + '%'
    //         }
    //       }
    //     }
    //   }
    // });

    /**
     * 3
    */

    // this.chart = new Chart('semiPieChart', {
    //   type: 'doughnut',
    //   data: {
    //     labels: ['เห็นด้วย', 'ไม่เห็นด้วย'],
    //     datasets: [{
    //       data: [this.agree, this.disagree],
    //       backgroundColor: ['#4CAF50', '#F44336'],
    //     }]
    //   },
    //   options: {
    //     rotation: -90,
    //     circumference: 180,
    //     cutout: '60%',
    //     plugins: {
    //       legend: {
    //         display: false
    //       },
    //       tooltip: {
    //         callbacks: {
    //           label: (context) => `${context.label}: ${context.parsed}%`
    //         }
    //       }
    //     }
    //   }
    // });
  }
}
