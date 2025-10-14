document.getElementById('vtd-form').addEventListener('submit', function(event) {
    event.preventDefault();

    let totalFreqScore = 0;
    let totalSevScore = 0;

    const freqScores = [];
    const sevScores = [];

    for (let i = 1; i <= 8; i++) {  // Anzahl der Fragen anpassen
        const freqScore = parseInt(document.querySelector(`input[name="freq${i}"]:checked`).value);
        const sevScore = parseInt(document.querySelector(`input[name="sev${i}"]:checked`).value);
        totalFreqScore += freqScore;
        totalSevScore += sevScore;
        freqScores.push(freqScore);
        sevScores.push(sevScore);
    }

    document.getElementById('result').innerHTML = `
        <h2>Ergebnis</h2>
        <p>Gesamtpunktzahl Häufigkeit: ${totalFreqScore}</p>
        <p>Gesamtpunktzahl Schweregrad: ${totalSevScore}</p>
    `;

    const ctx = document.getElementById('resultChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Trockenheit', 'Brennen', 'Räusperzwang', 'Engegefühl', 'Juckreiz', 'Schmerzen', 'Klossgefühl', 'Müdigkeit'],
            datasets: [
                {
                    label: 'Häufigkeit',
                    data: freqScores,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Schweregrad',
                    data: sevScores,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Create PDF after displaying the result and chart
    setTimeout(function() {
        html2canvas(document.querySelector("#resultChart")).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            // Add title to PDF
            pdf.setFontSize(18);
            pdf.text(10, 15, "Fragebogen Stimme");

            // Add results text to PDF
            pdf.setFontSize(12);
            pdf.text(10, 30, `Gesamtpunktzahl Häufigkeit: ${totalFreqScore}`);
            pdf.text(10, 40, `Gesamtpunktzahl Schweregrad: ${totalSevScore}`);

            // Add chart image to PDF
            pdf.addImage(imgData, 'PNG', 10, 50, 180, 160);

            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0];
            const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-');
            const fileName = `Fragebogen_Stimme_${formattedDate}_${formattedTime}.pdf`;

            pdf.save(fileName);

            // Redirect after saving PDF
            setTimeout(function() {
                window.location.href = 'https://stimmanalyse.glitch.me';
            }, 2000); // Additional 2 seconds delay
        });
    }, 3000); // 3 seconds delay to show the result
});