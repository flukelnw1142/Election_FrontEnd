import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  chart!: Chart;

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (this.chart) {
      this.chart.data.datasets[0].data = [this.agree, this.disagree];
      this.chart.update();
    }
  }

  createChart() {
    /**
     * 1
     */
    this.chart = new Chart('pieChart', {
      type: 'pie',
      data: {
        labels: ['เห็นด้วย', 'ไม่เห็นด้วย'],
        datasets: [{
          data: [this.agree, this.disagree],
          backgroundColor: ['#4CAF50', '#F44336'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false   // ซ่อน legend
          },
          tooltip: {
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
        }
      }
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
