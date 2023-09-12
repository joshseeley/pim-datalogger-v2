

const ctx = document.getElementById('myChart');

const chartLabels = ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange']
const chartData = [11, 19, 3, 5, 2, 3];


    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [{
          label: '# of Votes',
          data: chartData,
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    