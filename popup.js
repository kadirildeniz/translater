document.addEventListener('DOMContentLoaded', function() {
    // Kayıtlı API anahtarını yükle
    chrome.storage.sync.get(['translationApiKey'], function(result) {
        if (result.translationApiKey) {
            document.getElementById('apiKey').value = result.translationApiKey;
        }
    });

    // Kaydet butonuna tıklandığında
    document.getElementById('saveButton').addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey').value;
        chrome.storage.sync.set({
            translationApiKey: apiKey
        }, function() {
            alert('API anahtarı kaydedildi!');
        });
    });
}); 