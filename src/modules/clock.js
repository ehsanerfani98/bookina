/**
 * Analog Clock Functionality
 * Handles the analog clock display
 */

document.addEventListener("DOMContentLoaded", function() {
    const hr = document.getElementById('hr');
    const mn = document.getElementById('min');
    const sc = document.getElementById('sec');

    function updateClock() {
        let day = new Date();
        let hh = day.getHours() * 30;
        let mm = day.getMinutes() * 6;
        let ss = day.getSeconds() * 6;

        hr.style.transform = `rotateZ(${hh + (mm / 12)}deg)`;
        mn.style.transform = `rotateZ(${mm}deg)`;
        sc.style.transform = `rotateZ(${ss}deg)`;

        // Update digital time if needed
        const digitalTime = document.getElementById('digitalTime');
        if (digitalTime) {
            const hours = String(day.getHours()).padStart(2, '0');
            const minutes = String(day.getMinutes()).padStart(2, '0');
            digitalTime.textContent = `${hours}:${minutes}`;
        }
    }

    // Initial update
    updateClock();
    
    // Update every second
    setInterval(updateClock, 1000);
});
