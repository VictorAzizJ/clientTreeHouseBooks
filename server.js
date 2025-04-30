// server.js
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const path       = require('path');
const dotenv     = require('dotenv');
const mongoose   = require('mongoose');
const morgan     = require('morgan');
const winston    = require('winston');

dotenv.config();

// Create Express app
const app = express();

app.set('trust proxy', 1);


/** 1. Secure headers */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://dev-05500438.okta.com"],
        imgSrc: ["'self'", "data:"],
        formAction: [
          "'self'",
          "https://clienttreehousebooks.onrender.com",
          "https://dev-05500438.okta.com"
        ],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        scriptSrcAttr: ["'none'"],
        upgradeInsecureRequests: [],
      }
    }
  })
);



/** 2. CORS: only allow your production domain */
app.use(cors({
  origin: 'https://clienttreehousebooks.onrender.com',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}));

/** 3. Rate limiter */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

/** 4. HTTP request logging */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
logger.stream = { write: msg => logger.info(msg.trim()) };
app.use(morgan('combined', { stream: logger.stream }));

/** 5. Body parsing */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/** 6. Session management */
const sessionSecret = process.env.SESSION_SECRET || 'testsecret';
let sessionStore;

if (process.env.NODE_ENV === 'test') {
  // In Jest tests, use in-memory store (no extra connections)
  sessionStore = new session.MemoryStore();
} else {
  // In dev/prod, persist sessions in MongoDB
  sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  });
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

/** 7. Views & static assets */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

/** 8. MongoDB connection (skipped in tests) */
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
} else {
  logger.info('Skipping MongoDB connection in test environment');
}

/** 9. Health‑check endpoint */
app.get('/healthz', (req, res) => {
  if (process.env.NODE_ENV === 'test') {
    // Always healthy in test mode
    return res.status(200).json({ status: 'OK', db: 'up' });
  }
  const state = mongoose.connection.readyState;
  if (state === 1) {
    return res.status(200).json({ status: 'OK', db: 'up' });
  }
  res.status(500).json({ status: 'ERROR', db: 'down' });
});

/** 10. Mount routes */
// Registration
app.use('/', require('./routes/register'));
// Landing / index
app.use('/', require('./routes/index'));
// Login
app.use('/', require('./routes/login'));
// Dashboard
app.use('/', require('./routes/dashboard'));
// Admin management
app.use('/', require('./routes/admin'));

/** 11. Logout */
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

/** 12. Error handler */
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Export the app for testing
module.exports = app;

// If run directly, start the HTTP server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}
