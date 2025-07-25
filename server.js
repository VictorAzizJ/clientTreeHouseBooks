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

// ─── Mongoose Models ────────────────────────────────────────────────────────
// Ensure these schemas get registered before you mount any routes that use them:
require('./models/Attendance');       // ← added
require('./models/MetricValue');      // ← added
require('./models/MetricDefinition'); // ← added
// (Program, Member, Checkout, Donation, etc. are pulled in by their routes)


// Create Express app
const app = express();
app.set('trust proxy', 1);

// ─── 1. Security ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "https://cdn.jsdelivr.net",
      "https://secure.lglforms.com",
      "'unsafe-inline'"
    ],
    styleSrc: [
      "'self'",
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
      "'unsafe-inline'"
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "https://secure.lglforms.com"],
    frameSrc: ["'self'", "https://secure.lglforms.com"],
    imgSrc: ["'self'", "data:"],
    formAction: [
      "'self'",
      "https://clienttreehousebooks.onrender.com",
      "https://secure.lglforms.com"
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'self'"],
    upgradeInsecureRequests: []
  }
}));

// ─── 2. CORS ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_BASE_URL || 'https://clienttreehousebooks.onrender.com',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}));

// ─── 3. Rate Limiting ───────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

// ─── 4. Logging ─────────────────────────────────────────────────────────────
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

// ─── 5. Body Parsing ─────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── 6. Session Management ───────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET || 'testsecret';
let sessionStore;

if (process.env.NODE_ENV === 'test') {
  sessionStore = new session.MemoryStore();
} else {
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

// ─── 7. Views & Static Assets ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 8. MongoDB Connection ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
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

// ─── 9. Health Check ────────────────────────────────────────────────────────
app.get('/healthz', (req, res) => {
  if (process.env.NODE_ENV === 'test') {
    return res.status(200).json({ status: 'OK', db: 'up' });
  }
  const state = mongoose.connection.readyState; // 1 = connected
  res.status(state === 1 ? 200 : 500).json({
    status: state === 1 ? 'OK' : 'ERROR',
    db:     state === 1 ? 'up' : 'down'
  });
});

// ─── 10. Route Mounting ─────────────────────────────────────────────────────
// Core flows:
app.use('/', require('./routes/register'));
app.use('/', require('./routes/index'));
app.use('/', require('./routes/login'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/admin'));         // your adminUsers logic
app.use('/', require('./routes/notifications'));
app.use('/', require('./routes/messages'));
app.use('/', require('./routes/members'));
app.use('/', require('./routes/checkouts'));
app.use('/', require('./routes/donations'));

// Programs & Metrics (new):
app.use('/', require('./routes/programs'));      // ← verify you’ve created this file
app.use('/', require('./routes/attendees'));
app.use('/', require('./routes/attendance'));
app.use('/', require('./routes/metrics'));       // ← verify mounting ends with semicolon

// ─── 11. Logout ─────────────────────────────────────────────────────────────
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ─── 12. Error Handling ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// ─── 13. Export & Start ─────────────────────────────────────────────────────
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}
