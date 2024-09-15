const express = require('express');
const Atomizer = require('atomizer');

const app = express();
const port = 8000;

app.use(express.static('public'));
app.use(express.json());

app.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // Send a ping approx every 2 seconds
  const intervalId = setInterval(() => {
    res.write('data: ping\n\n');
  }, 2000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.post('/process-acss', (req, res) => {
  const { html, config } = req.body;
  console.log('Received raw HTML:', html);
  console.log('Received raw config:', config);

  if (!html || html.trim() === '') {
    console.error('Empty HTML input received');
    return res.status(400).json({ error: 'Empty HTML input', details: 'Please provide valid HTML with ACSS classes.' });
  }

  const atomizer = new Atomizer();

  try {
    let customConfig = {};
    try {
      customConfig = config ? JSON.parse(config) : {};
    } catch (configError) {
      console.error('Error parsing config:', configError);
      throw new Error('Invalid ACSS config');
    }

    console.log('Parsed Config:', JSON.stringify(customConfig, null, 2));

    const detectedClasses = atomizer.findClassNames(html);
    console.log('Raw detected classes:', detectedClasses);
    console.log('Detected classes count:', detectedClasses.length);

    if (detectedClasses.length === 0) {
      console.warn('No ACSS classes detected in the HTML input');
      return res.status(400).json({ error: 'No ACSS classes found', details: 'The provided HTML does not contain any valid ACSS classes.' });
    }

    let parsedConfig;
    try {
      parsedConfig = atomizer.getConfig(detectedClasses, customConfig);
    } catch (getConfigError) {
      console.error('Error in atomizer.getConfig:', getConfigError);
      throw getConfigError;
    }

    console.log('Parsed Atomizer Config:', JSON.stringify(parsedConfig, null, 2));

    let css;
    try {
      css = atomizer.getCss(parsedConfig);
    } catch (getCssError) {
      console.error('Error in atomizer.getCss:', getCssError);
      throw getCssError;
    }

    console.log('Generated CSS:', css);

    if (css && css.trim() !== '') {
      res.json({ success: true, css });
    } else {
      console.error('No CSS generated');
      res.status(500).json({ error: 'No CSS generated', details: 'The Atomizer library did not produce any CSS output.' });
    }
  } catch (error) {
    console.error('Error processing ACSS:', error);
    res.status(500).json({ error: 'Failed to process ACSS', details: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
