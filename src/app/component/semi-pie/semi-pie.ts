import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-semi-pie',
  templateUrl: './semi-pie.html',
  styleUrl: './semi-pie.scss'
})
export class SemiPie implements AfterViewInit, OnChanges {

  @Input() agree = 0;
  @Input() disagree = 0;

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
    this.chart = new Chart('barChart', {
      type: 'bar',
      data: {
        labels: ['เห็นด้วย', 'ไม่เห็นด้วย'],
        datasets: [{
          data: [this.agree, this.disagree],
          backgroundColor: ['#4CAF50', '#F44336'],
          borderRadius: 6,
          barThickness: 70,
          maxBarThickness: 80,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              display: false
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + '%'
            }
          }
        }
      }
    });

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
