'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const expect = require('chai').expect;
require('dotenv').config();

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// ✅ Helmet con configuración CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'trusted-cdn.com'],
    }
  })
);

// ✅ Archivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));

// ✅ CORS para FreeCodeCamp
app.use(cors({ origin: '*' }));

// ✅ Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Página principal sin encabezado manual
app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// ✅ Rutas de testing FCC
fccTestingRoutes(app);

// ✅ Rutas de API
apiRoutes(app);

// ✅ Middleware 404
app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// ✅ Inicio del servidor y ejecución de tests
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

module.exports = app;
