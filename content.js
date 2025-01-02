function createTranslateButton() {
    if (document.getElementById('translate-button')) return;

    const translateButton = document.createElement('div');
    translateButton.id = 'translate-button';
    translateButton.innerHTML = `
        <span>PDF'yi Türkçe'ye Çevir</span>
    `;
    translateButton.addEventListener('click', translateAndDownloadPDF);
    document.body.appendChild(translateButton);
}

async function translateAndDownloadPDF() {
    try {
        showMessage('PDF işleniyor...');
        console.log('PDF işlemi başladı');
        
        const pdfUrl = window.location.href;
        console.log('PDF URL:', pdfUrl);
        
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js kütüphanesi yüklenemedi');
        }

        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`PDF alınamadı: ${response.status} ${response.statusText}`);
        }
        
        const pdfData = await response.arrayBuffer();
        console.log('PDF verisi alındı, boyut:', pdfData.byteLength);

        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.js');
        
        const loadingTask = pdfjsLib.getDocument({data: pdfData});
        const pdf = await loadingTask.promise;
        console.log('PDF yüklendi, sayfa sayısı:', pdf.numPages);

        let translatedText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            showMessage(`Sayfa işleniyor: ${i}/${pdf.numPages}`);
            console.log(`Sayfa ${i} işleniyor`);
            
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            console.log(`Sayfa ${i} metin içeriği:`, pageText.substring(0, 100) + '...');
            
            if (pageText.trim()) {
                const translatedPage = await translateText(pageText);
                translatedText += translatedPage + '\n\n';
                console.log(`Sayfa ${i} çeviri tamamlandı`);
            }
        }
        
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF kütüphanesi yüklenemedi');
        }

        console.log('Yeni PDF oluşturuluyor');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        doc.setFont('helvetica');
        doc.setFontSize(11);

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const usableWidth = pageWidth - (2 * margin);

        function convertTurkishChars(text) {
            const turkishChars = {
                'ğ': 'g', 'Ğ': 'G',
                'ü': 'u', 'Ü': 'U',
                'ş': 's', 'Ş': 'S',
                'ı': 'i', 'İ': 'I',
                'ö': 'o', 'Ö': 'O',
                'ç': 'c', 'Ç': 'C'
            };
            return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, letter => turkishChars[letter] || letter);
        }

        const lines = doc.splitTextToSize(convertTurkishChars(translatedText), usableWidth);
        let currentPage = 1;
        let y = margin;

        lines.forEach((line, index) => {
            if (y > pageHeight - margin) {
                doc.addPage();
                currentPage++;
                y = margin;
            }

            doc.text(line, margin, y, {
                align: 'left',
                maxWidth: usableWidth
            });

            y += 7; 

            if (index % 50 === 0) {
                console.log(`PDF yazma ilerlemesi: ${index}/${lines.length}`);
                showMessage(`Sayfa ${currentPage} oluşturuluyor...`);
            }
        });

        console.log('PDF oluşturma tamamlandı, indirme başlıyor');
        doc.save('cevirilen_dokuman.pdf');
        showMessage('Çeviri tamamlandı! PDF indiriliyor...');
        
    } catch (error) {
        console.error('PDF çeviri hatası - Detaylı hata:', error);
        console.error('Hata stack:', error.stack);
        showMessage(`PDF çevrilirken bir hata oluştu: ${error.message}`);
    }
}

async function translateText(text) {
    try {
        const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
        let translatedChunks = [];

        for (const chunk of chunks) {
            if (chunk.trim().length === 0) continue;

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(chunk)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Çeviri API hatası: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data && data[0]) {
                const translatedChunk = data[0]
                    .map(item => item[0])
                    .join(' ')
                    .trim();
                translatedChunks.push(translatedChunk);
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return translatedChunks
            .join(' ')
            .replace(/ +/g, ' ') 
            .replace(/\n+/g, '\n') 
            .trim();

    } catch (error) {
        console.error('Çeviri hatası:', error);
        throw error;
    }
}

function showMessage(message) {
    let messagePopup = document.getElementById('message-popup');
    
    if (!messagePopup) {
        messagePopup = document.createElement('div');
        messagePopup.id = 'message-popup';
        document.body.appendChild(messagePopup);
    }
    
    console.log('Mesaj:', message);
    messagePopup.innerText = message;
    messagePopup.style.display = 'block';
    
    if (message.includes('tamamlandı')) {
        setTimeout(() => {
            messagePopup.style.display = 'none';
        }, 5000);
    }
}

function init() {
    console.log('Eklenti başlatılıyor');
    createTranslateButton();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 