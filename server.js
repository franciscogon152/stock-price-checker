'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai').expect;
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// Static files
app.use('/public', express.static(process.cwd() + '/public'));

// CORS for FCC testing
app.use(cors({ origin: '*' }));

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Security headers: Helmet con CSP explícito
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "script-src": ["'self'"],
      "style-src": ["'self'"],
    },
  })
);

// Desactivar frameguard si lo pide FCC
app.use(helmet.frameguard({ action: 'deny' }));

// Optional: enable if req.ip returns internal IPs
// app.enable('trust proxy');

// Index page
app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// FCC testing routes
fccTestingRoutes(app);

// API routes
apiRoutes(app);

// 404 middleware
app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start server and run tests
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(() => {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.log(e);
      }
    }, 3500);
  }
});

module.exports = app; // for testing

