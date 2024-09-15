const htmlInput = document.getElementById('html-input');
const acssConfig = document.getElementById('acss-config');
const cssOutput = document.getElementById('css-output');
const previewFrame = document.getElementById('preview-frame');
const atomizerVersion = document.getElementById('atomizer-version');
const saveBtn = document.getElementById('save-btn');
const shareBtn = document.getElementById('share-btn');
const loadInput = document.getElementById('load-input');
const loadBtn = document.getElementById('load-btn');

// Set initial values
htmlInput.value = '<div class="P(20px) C(#333) Fz(20px)">Hello, Atomizer!</div>';
acssConfig.value = '{\n  "custom": {\n    "color": {\n      "brand": "#ff0000"\n    }\n  }\n}';

// Initialize SSE
const eventSource = new EventSource('/stream');

eventSource.onmessage = (event) => {
    console.log('Received SSE message:', event.data);
    try {
        const { css } = JSON.parse(event.data);
        console.log('Received CSS:', css);
        cssOutput.textContent = css;
        Prism.highlightElement(cssOutput);
        updatePreview(htmlInput.value, css);
        checkCssPane();
    } catch (error) {
        console.error('Error processing SSE message:', error);
    }
};

eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const processAcss = debounce(() => {
    console.log('Processing ACSS...');
    console.log('HTML Input:', htmlInput.value);
    console.log('ACSS Config:', acssConfig.value);
    fetch('/process-acss', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            html: htmlInput.value,
            config: acssConfig.value,
        }),
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('ACSS processing response:', data);
        if (data.css) {
            console.log('Generated CSS:', data.css);
            cssOutput.textContent = data.css;
            Prism.highlightElement(cssOutput);
            updatePreview(htmlInput.value, data.css);
        } else {
            console.error('No CSS generated');
            cssOutput.textContent = 'No CSS generated';
        }
        checkCssPane();
    })
    .catch(error => {
        console.error('Error processing ACSS:', error);
        cssOutput.textContent = `Error: ${error.message}`;
    });
}, 300);

htmlInput.addEventListener('input', processAcss);
acssConfig.addEventListener('input', processAcss);

function updatePreview(html, css) {
    const preview = previewFrame.contentDocument;
    preview.open();
    preview.write(`
        <html>
            <head>
                <style>${css}</style>
            </head>
            <body>${html}</body>
        </html>
    `);
    preview.close();
}

function checkCssPane() {
    console.log('CSS Pane content:', cssOutput.textContent);
    if (cssOutput.textContent.trim() === '') {
        console.warn('CSS Pane is empty');
    }
}

// Fetch Atomizer version
fetch('https://api.npms.io/v2/package/atomizer')
    .then(response => response.json())
    .then(data => {
        atomizerVersion.textContent = data.collected.metadata.version;
    })
    .catch(error => {
        console.error('Error fetching Atomizer version:', error);
        atomizerVersion.textContent = 'Unknown';
    });

// Save configuration
saveBtn.addEventListener('click', () => {
    const config = {
        html: htmlInput.value,
        acss: acssConfig.value
    };
    localStorage.setItem('atomizer-playground-config', JSON.stringify(config));
    alert('Configuration saved!');
});

// Share configuration
shareBtn.addEventListener('click', () => {
    const config = {
        html: htmlInput.value,
        acss: acssConfig.value
    };
    const encodedConfig = btoa(JSON.stringify(config));
    const shareUrl = `${window.location.origin}${window.location.pathname}?config=${encodedConfig}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share URL copied to clipboard!');
    });
});

// Load configuration
loadBtn.addEventListener('click', () => {
    const shareUrl = loadInput.value;
    const url = new URL(shareUrl);
    const encodedConfig = url.searchParams.get('config');
    if (encodedConfig) {
        try {
            const config = JSON.parse(atob(encodedConfig));
            htmlInput.value = config.html;
            acssConfig.value = config.acss;
            processAcss();
            alert('Configuration loaded successfully!');
        } catch (error) {
            console.error('Error loading configuration:', error);
            alert('Error loading configuration. Please check the URL and try again.');
        }
    } else {
        alert('Invalid share URL. Please check the URL and try again.');
    }
});

// Check for shared configuration on page load
window.addEventListener('load', () => {
    const url = new URL(window.location.href);
    const encodedConfig = url.searchParams.get('config');
    if (encodedConfig) {
        try {
            const config = JSON.parse(atob(encodedConfig));
            htmlInput.value = config.html;
            acssConfig.value = config.acss;
            processAcss();
        } catch (error) {
            console.error('Error loading shared configuration:', error);
        }
    } else {
        // Load saved configuration if available
        const savedConfig = localStorage.getItem('atomizer-playground-config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                htmlInput.value = config.html;
                acssConfig.value = config.acss;
                processAcss();
            } catch (error) {
                console.error('Error loading saved configuration:', error);
            }
        }
    }
});

// Initial ACSS processing
processAcss();
