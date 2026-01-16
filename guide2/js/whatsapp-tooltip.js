// WhatsApp Tooltip Auto-Show Script
document.addEventListener('DOMContentLoaded', function() {
    const whatsappBtn = document.querySelector('.whatsapp-btn');

    if (whatsappBtn) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'whatsapp-tooltip';
        tooltip.setAttribute('data-translate', 'how_can_help');
        
        // Get current language and set appropriate text
        const currentLang = (window.LanguageTranslator && window.LanguageTranslator.getCurrentLanguage()) || 'en';
        
        // Default texts for supported languages
        const tooltipTexts = {
            'en': 'How can I help you?',
            'hi': 'मैं आपकी कैसे मदद कर सकता हूँ?',
            'es': '¿Cómo puedo ayudarte?',
            'fr': 'Comment puis-je vous aider?',
            'ar': 'كيف يمكنني مساعدتك؟',
            'de': 'Wie kann ich Ihnen helfen?'
        };
        
        tooltip.textContent = tooltipTexts[currentLang] || tooltipTexts['en'];

        whatsappBtn.appendChild(tooltip);

        // Show tooltip after 3 seconds and keep it visible
        setTimeout(function() {
            whatsappBtn.classList.add('show-tooltip');
        }, 3000);

        // Hide tooltip only when user clicks the WhatsApp button
        whatsappBtn.addEventListener('click', function() {
            whatsappBtn.classList.remove('show-tooltip');
        });

        // Listen for language changes and update tooltip
        document.addEventListener('languageChanged', function(e) {
            const newLang = e.detail.language;
            tooltip.textContent = tooltipTexts[newLang] || tooltipTexts['en'];
        });
    }
});