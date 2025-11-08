// 1) unique_code aus der URL holen
const urlParams = new URLSearchParams(window.location.search);
const uniqueCode = urlParams.get('unique_code') || 'ohne_code';

// 2) Formular-Submit behandeln
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

    // 3) PDF erzeugen + an Backend schicken
    setTimeout(function() {
        html2canvas(document.querySelector("#resultChart")).then(async (canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            // Titel
            pdf.setFontSize(18);
            pdf.text(10, 15, "Fragebogen Stimme");

            // Ergebnisse
            pdf.setFontSize(12);
            pdf.text(10, 30, `Gesamtpunktzahl Häufigkeit: ${totalFreqScore}`);
            pdf.text(10, 40, `Gesamtpunktzahl Schweregrad: ${totalSevScore}`);

            // Chart-Bild
            pdf.addImage(imgData, 'PNG', 10, 50, 180, 160);

            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0];
            const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-');
            const fileName = `Fragebogen_Stimme_${formattedDate}_${formattedTime}.pdf`;

            // OPTIONAL: PDF dem Patienten direkt anbieten
            pdf.save(fileName);

            // 3a) PDF in Base64 konvertieren
            const pdfDataUri = pdf.output('datauristring');        // "data:application/pdf;base64,...."
            const pdfBase64 = pdfDataUri.split(',')[1];            // nur der Base64-Teil

            // 3b) an dein Backend schicken
            try {
                const response = await fetch('https://DEIN-REPLIT-NAME.replit.dev/api/save-vhi-results', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        unique_code: uniqueCode,
                        pdf_base64: pdfBase64,
                        filename: fileName
                    })
                });

                if (!response.ok) {
                    console.error('Fehler beim Speichern in Supabase', await response.text());
                    alert('Das PDF konnte nicht auf dem Server gespeichert werden. Bitte später erneut versuchen.');
                    return;
                }

                // 3c) Weiterleitung zur Stimmanalyse MIT unique_code
                window.location.href = `https://stimmanalyse.glitch.me?unique_code=${encodeURIComponent(uniqueCode)}`;

            } catch (err) {
                console.error('Netzwerkfehler beim Senden des PDFs:', err);
                alert('Der Server ist momentan nicht erreichbar. Bitte später nochmal versuchen.');
            }
        });
    }, 3000); // 3 Sekunden, damit Ergebnis & Chart sichtbar sind
});
