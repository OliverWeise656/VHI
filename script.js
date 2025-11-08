// VHI – Auswertung, PDF-Erstellung und Upload nach Replit/Supabase

// 1) unique_code aus der URL lesen (kommt vom Hörtest)
const urlParams = new URLSearchParams(window.location.search);
const uniqueCode = urlParams.get('unique_code') || 'ohne_code';

// 2) Replit-Backend-URL (DEIN Projekt)
const API_BASE_URL = 'https://88f0ebbc-c5a0-4bef-a2d4-10f1590174b7-00-ve3euxlsxphu.kirk.replit.dev';
const SAVE_VHI_RESULTS_URL = `${API_BASE_URL}/api/save-vhi-results`;

// 3) Chart-Instanz (damit bei mehreren Durchläufen nicht übereinander gezeichnet wird)
let resultChartInstance = null;

// 4) Formular-Submit
document.getElementById('vtd-form').addEventListener('submit', function (event) {
    event.preventDefault();

    let totalFreqScore = 0;
    let totalSevScore = 0;

    const freqScores = [];
    const sevScores = [];

    // Fragen 1–8 auslesen
    for (let i = 1; i <= 8; i++) {
        const freqInput = document.querySelector(`input[name="freq${i}"]:checked`);
        const sevInput = document.querySelector(`input[name="sev${i}"]:checked`);

        if (!freqInput || !sevInput) {
            alert('Bitte beantworten Sie alle Fragen vollständig.');
            return;
        }

        const freqScore = parseInt(freqInput.value);
        const sevScore = parseInt(sevInput.value);

        totalFreqScore += freqScore;
        totalSevScore += sevScore;

        freqScores.push(freqScore);
        sevScores.push(sevScore);
    }

    // Ergebnistext anzeigen
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <h2>Ergebnis</h2>
        <p>Gesamtpunktzahl Häufigkeit: ${totalFreqScore}</p>
        <p>Gesamtpunktzahl Schweregrad: ${totalSevScore}</p>
    `;

    // Vorherigen Chart ggf. zerstören
    if (resultChartInstance) {
        resultChartInstance.destroy();
    }

    const ctx = document.getElementById('resultChart').getContext('2d');
    resultChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                'Trockenheit',
                'Brennen',
                'Räusperzwang',
                'Engegefühl',
                'Juckreiz',
                'Schmerzen',
                'Klossgefühl',
                'Müdigkeit'
            ],
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

    // 5) PDF erzeugen und an Backend senden
    // kurze Verzögerung, damit der Chart sicher gerendert ist
    setTimeout(function () {
        html2canvas(document.querySelector('#resultChart')).then(async (canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();

            // Titel
            pdf.setFontSize(18);
            pdf.text(10, 15, 'Fragebogen Stimme');

            // Ergebnisse
            pdf.setFontSize(12);
            pdf.text(10, 30, `Gesamtpunktzahl Häufigkeit: ${totalFreqScore}`);
            pdf.text(10, 40, `Gesamtpunktzahl Schweregrad: ${totalSevScore}`);

            // Chart-Bild
            pdf.addImage(imgData, 'PNG', 10, 50, 180, 160);

            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0];
            const formattedTime = date
                .toTimeString()
                .split(' ')[0]
                .replace(/:/g, '-');
            const fileName = `Fragebogen_Stimme_${formattedDate}_${formattedTime}.pdf`;

            // PDF lokal speichern (für Patient/Benutzer)
            pdf.save(fileName);

            // PDF als Base64 für das Backend vorbereiten
            const pdfDataUri = pdf.output('datauristring'); // "data:application/pdf;base64,...."
            const pdfBase64 = pdfDataUri.split(',')[1]; // nur der Base64-Teil

            try {
                // 6) an Replit-Backend schicken
                const response = await fetch(SAVE_VHI_RESULTS_URL, {
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
                    console.error('Fehler beim Speichern der VHI-Daten:', await response.text());
                    alert(
                        'Das PDF konnte nicht auf dem Server gespeichert werden. ' +
                        'Bitte informieren Sie die Praxis, falls dieses Problem erneut auftritt.'
                    );
                    return;
                }

                // 7) Weiterleitung zur Stimmanalyse (mit unique_code)
                window.location.href =
                    'https://stimmanalyse.glitch.me?unique_code=' +
                    encodeURIComponent(uniqueCode);

            } catch (error) {
                console.error('Netzwerkfehler beim Senden des PDFs:', error);
                alert(
                    'Der Server ist momentan nicht erreichbar. ' +
                    'Bitte versuchen Sie es später erneut oder wenden Sie sich an die Praxis.'
                );
            }
        });
    }, 1000); // 1 Sekunde reicht meist, damit der Chart fertig ist
});
