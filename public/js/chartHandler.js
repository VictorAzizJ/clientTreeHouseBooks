// chartHandler.js
/*document.addEventListener('DOMContentLoaded', () => {
    const donationData = data.donations;
    const volunteerData = data.volunteers;

    // Donation Chart
    const donationCtx = document.getElementById('donationChart').getContext('2d');
    new Chart(donationCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Donations ($)',
                data: donationData,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        }
    });

    // Volunteer Chart
    const volunteerCtx = document.getElementById('volunteerChart').getContext('2d');
    new Chart(volunteerCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Volunteers',
                data: volunteerData,
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        }
    });

    // CountUp Animations
    donationData.forEach((value, index) => {
        const counter = new CountUp(`donationCount${index}`, value);
        if (!counter.error) {
            counter.start();
        }
    });
});*/


document.addEventListener("DOMContentLoaded", () => {
  // Retrieve color variables from CSS
  const style = getComputedStyle(document.documentElement);
  const chartBarBg = style.getPropertyValue("--chart-bar-bg").trim();
  const chartBarBorder = style.getPropertyValue("--chart-bar-border").trim();
  const chartLineBg = style.getPropertyValue("--chart-line-bg").trim();
  const chartLineBorder = style.getPropertyValue("--chart-line-border").trim();

  // Mock data for totals and percentage changes
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const sideWalkWeek = [
    '10 / 28 / 2024',
    '10 / 21 / 2024',
    '10 / 17 / 2024',
    '10 / 7 / 2024',
    '10 / 1 / 2024',
    '9 / 23 / 2024',
    '9 / 16 / 2024',
    '9 / 10 / 2024',
    '9 / 3 / 2024',
    '8 / 27 / 2024',
    '8 / 19 / 2024',
    '8 / 12 / 2024',
    '8 / 5 / 2024',
    '7 / 29 / 2024',
    '7 / 22 / 2024',
    '7 / 15 / 2024',
    '7 / 8 / 2024',
    '7 / 1 / 2024',
    '6 / 24 / 2024',
    '6 / 17 / 2024',
    '6 / 10 / 2024',
    '6 / 3 / 2024',
    '5 / 28 / 2024',
    '5 / 20 / 2024',
    '5 / 13 / 2024',
    '5 / 6 / 2024',
    '4 / 29 / 2024',
    '4 / 22 / 2024',
    '4 / 15 / 2024',
    '4 / 1 / 2024',
    '3 / 25 / 2024',
    '3 / 18 / 2024',
    '3 / 11 / 2024',
    '3 / 4 / 2024',
    '2 / 26 / 2024',
    '2 / 20 / 2024',
    '2 / 12 / 2024',
    '2 / 5 / 2024',
    '1 / 29 / 2024',
    '1 / 16 / 2024',
    '1 / 8 / 2024',
    '1 / 2 / 2024',
  ];
  const totalsData = [
    1926, 2628, 2422, 2103, 2468, 2477, 2659, 2913, 2303, 2208,
  ];
  const percentageChangesData = [100,
    22.1574344,
    4.181184669,
    31.83139535,
    13.63636364,
    6.19047619,
    19.94134897,
    16.11030479,
    27.36443884,
    13.04347826,
    22.86158631,
    15.80547112,
    2.079722704,
    12.95418641,
    10.16666667,
    11.414791,
    14.77104874,
    15.44117647,
    20.53973013,
    14.03225806,
    13.13291139,
    11.00478469,
    7.55033557,
    15.13761468,
    11.05990783,
    4.269293924,
    8.737864078,
    8.116883117,
    10.71975498,
    11.73020528,
    7.109737249,
    7.033639144,
    12.06395349,
    5.636070853,
    3.25732899,
    15.77380952,
    16.26409018,
    12.96875,
    13.74045802,
    8.250825083,
    6.435643564,
    6.331168831];

  // Total Amounts Bar Chart
  const totalsCtx = document.getElementById("totalsChart").getContext("2d");
  new Chart(totalsCtx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Total Book Checkout",
          data: totalsData,
          backgroundColor: chartBarBg,
          borderColor: chartBarBorder,
          borderWidth: 1,
        },
        {
          label: "Black Children Books",
          data: [277, 418, 341, 265, 233, 272, 429, 279, 271, 226], // Dataset for average donations
          borderColor: "#00103c", // Green color for secondary dataset
          backgroundColor: "rgba(0, 0, 0, 0.97)", // Light green fill for average donations
          borderWidth: 2,
          tension: 0.4, // Curves the line slightly
        },
        {
          label: "Children Books",
          data: [773, 1184, 1028, 765, 1177, 1050, 917, 1394, 941, 1029], // Dataset for average donations
          borderColor: "#00503c", // Green color for secondary dataset
          backgroundColor: "rgba(255, 99, 98, 0.97)", // Light green fill for average donations
          borderWidth: 2,
          tension: 0.4, // Curves the line slightly
        },
        {
          label: "Black Adult Books",
          data: [110, 176, 126, 148, 170, 238, 234, 176, 141, 126], // Dataset for average donations
          borderColor: "#00707d", // Green color for secondary dataset
          backgroundColor: "rgba(209, 133, 0, 0.97)", // Light green fill for average donations
          borderWidth: 2,
          tension: 0.4, // Curves the line slightly
        },
        {
          label: "Adult Titles",
          data: [528, 602, 651, 773, 727, 666, 807, 779, 768, 667], // Dataset for average donations
          borderColor: "#01713c", // Green color for secondary dataset
          backgroundColor: "rgba(39, 63, 245, 0.8)", // Light green fill for average donations
          borderWidth: 2,
          tension: 0.4, // Curves the line slightly
        },
        {
          label: "Board Books",
          data: [238, 248, 276, 152, 161, 251, 272, 285, 182, 160], // Dataset for average donations
          borderColor: "#21703c", // Green color for secondary dataset
          backgroundColor: "rgba(245, 40, 145, 0.8)", // Light green fill for average donations
          borderWidth: 2,
          tension: 0.4, // Curves the line slightly
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Total Amount ($)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Months",
          },
        },
      },
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
    },
  });

  // Average Percentage Change Line Chart
  const percentageChangeCtx = document
    .getElementById("percentageChangeChart")
    .getContext("2d");
  new Chart(percentageChangeCtx, {
    type: "line",
    data: {
      labels: sideWalkWeek,
      datasets: [
        {
          label: "Percentage of SideWalk Cart Disturbution",
          data: percentageChangesData,
          fill: false,
          borderColor: chartLineBorder,
          backgroundColor: chartLineBg,
          borderWidth: 2,
          pointBackgroundColor: chartLineBorder,
          pointRadius: 4,
        }
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + "%"; // Adds '%' sign to labels
            },
          },
          title: {
            display: true,
            text: "Percentage Change (%)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Months",
          },
        },
      },
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
    },
  });
});

// JavaScript for sidebar toggle and smooth scrolling
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleButton = document.getElementById("sidebarToggle");

  // Toggle sidebar visibility
  toggleButton.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Smooth scrolling to sections
  document.querySelectorAll(".sidebar a").forEach((anchor) => {
    anchor.addEventListener("click", function (event) {
      event.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);

      // Scroll to the section smoothly
      window.scrollTo({
        top: targetSection.offsetTop,
        behavior: "smooth",
      });

      // Close the sidebar after clicking
      sidebar.classList.remove("active");
    });
  });
});

//Count Up Example and Total Book Donations
document.addEventListener("DOMContentLoaded", () => {
  const targetValue = 24107; // Your target value
  const counter = new CountUp("counter", targetValue, {
    duration: 2, // duration of animation in seconds
    separator: ",", // add commas for large numbers
    decimalPlaces: 0, // set decimal places if needed
  });

  // Start the count animation
  if (!counter.error) {
    counter.start();
  } else {
    console.error(counter.error);
  }
});


//Chart for Programming //
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('donutChart').getContext('2d');

const donutChart = new Chart(ctx, {
    type: 'doughnut', // Doughnut type for donut chart
    data: {
        labels: ['Youth Attend Summer Camp', 'Youth Attend After School', 'Teen Programs', 'Attend All Programs'],
        datasets: [{
            label: 'Programing Attendance',
            data: [40, 25, 20, 15], // Sample data for each category
            backgroundColor: [
                '#f7951d', // Orange
                '#00703c', // Green
                '#007aff', // Blue
                '#ff4d4d'  // Red
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        cutout: '70%', // Controls the thickness of the donut ring
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        return `${tooltipItem.label}: ${tooltipItem.raw}%`; // Display label and percentage
                    }
                }
            }
        }
    }
});
});


//Chart for Volunteers//
document.addEventListener('DOMContentLoaded', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Chart 1: Monthly Volunteer Attendance
    const attendanceCtx = document.getElementById('attendanceChart').getContext('2d');
    const attendanceChart = new Chart(attendanceCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Volunteer Attendance',
                data: [20, 25, 30, 28, 35, 40, 38, 42, 37, 33, 30, 28], // Pseudo data for attendance
                backgroundColor: '#f7951d',
                borderColor: '#f7951d',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Volunteers'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `Attendance: ${tooltipItem.raw}`; // Show attendance number in tooltip
                        }
                    }
                }
            }
        }
    });

    // Chart 2: Average Volunteering Hours per Volunteer
    const hoursCtx = document.getElementById('hoursChart').getContext('2d');
    const hoursChart = new Chart(hoursCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Avg. Hours per Volunteer',
                data: [5.5, 6.0, 6.2, 5.8, 6.5, 7.0, 7.2, 7.5, 7.1, 6.8, 6.0, 5.7], // Pseudo data for avg hours
                borderColor: '#00703c',
                backgroundColor: 'rgba(0, 112, 60, 0.2)', // Light green fill
                borderWidth: 2,
                tension: 0.3 // Smooth curve
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Avg. Hours'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `Avg Hours: ${tooltipItem.raw.toFixed(1)} hrs`; // Show average hours with one decimal
                        }
                    }
                }
            }
        }
    });
});


