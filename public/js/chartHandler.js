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

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve color variables from CSS
    const style = getComputedStyle(document.documentElement);
    const chartBarBg = style.getPropertyValue('--chart-bar-bg').trim();
    const chartBarBorder = style.getPropertyValue('--chart-bar-border').trim();
    const chartLineBg = style.getPropertyValue('--chart-line-bg').trim();
    const chartLineBorder = style.getPropertyValue('--chart-line-border').trim();

    // Mock data for totals and percentage changes
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalsData = [500, 800, 600, 700, 900, 1200, 1100, 1300, 1250, 1400, 1450, 1600];
    const percentageChangesData = [0, 20, -10, 5, 30, 33, -8, 15, -4, 12, 3, 10];

    // Total Amounts Bar Chart
    const totalsCtx = document.getElementById('totalsChart').getContext('2d');
    new Chart(totalsCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Total Book Checkout',
                data: totalsData,
                backgroundColor: chartBarBg,
                borderColor: chartBarBorder,
                borderWidth: 1
            },{
                label: 'Average Donation ($)',
                data: [75, 85, 78, 82, 90, 95, 88], // Dataset for average donations
                borderColor: '#00703c', // Green color for secondary dataset
                backgroundColor: 'rgba(0, 112, 60, 0.2)', // Light green fill for average donations
                borderWidth: 2,
                tension: 0.4 // Curves the line slightly
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Amount ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Months'
                    }
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    // Average Percentage Change Line Chart
    const percentageChangeCtx = document.getElementById('percentageChangeChart').getContext('2d');
    new Chart(percentageChangeCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Average % Change',
                data: percentageChangesData,
                fill: false,
                borderColor: chartLineBorder,
                backgroundColor: chartLineBg,
                borderWidth: 2,
                pointBackgroundColor: chartLineBorder,
                pointRadius: 4
            },
            {
                label: 'Dumby Data',
                data: [75, 85, 78, 82, 90, 95, 88],
                fill: false,
                borderColor: chartLineBorder,
                backgroundColor: chartLineBg,
                borderWidth: 2,
                pointBackgroundColor: chartLineBorder,
                pointRadius: 4
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%'; // Adds '%' sign to labels
                        }
                    },
                    title: {
                        display: true,
                        text: 'Percentage Change (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Months'
                    }
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
});


// JavaScript for sidebar toggle and smooth scrolling
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebarToggle');

    // Toggle sidebar visibility
    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Smooth scrolling to sections
    document.querySelectorAll('.sidebar a').forEach(anchor => {
        anchor.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            // Scroll to the section smoothly
            window.scrollTo({
                top: targetSection.offsetTop,
                behavior: 'smooth'
            });

            // Close the sidebar after clicking
            sidebar.classList.remove('active');
        });
    });
});

//Count Up Example and Total Book Donations
document.addEventListener('DOMContentLoaded', () => {
    const targetValue = 24107; // Your target value
    const counter = new CountUp('counter', targetValue, {
        duration: 2, // duration of animation in seconds
        separator: ',', // add commas for large numbers
        decimalPlaces: 0 // set decimal places if needed
    });

    // Start the count animation
    if (!counter.error) {
        counter.start();
    } else {
        console.error(counter.error);
    }
});