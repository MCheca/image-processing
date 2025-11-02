const path = require('path');

// Force Jest tests to use a dedicated output directory
process.env.OUTPUT_DIR = path.join(__dirname, '..', 'output-test');
