// server.js
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const session    = require('express-session');
const path       = require('path');
const dotenv     = require('dotenv');
const mongoose   = require('mongoose');
const morgan     = require('morgan');
const winston    = require('winston');
// const Sentry  = require('@sentry/node'); // ← we'll re‑enable this later

dotenv.config();

// Create Express app
const app = express();

/** 1. Secure headers */
app.use(helmet());

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
// Winston logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // Local files (optional in production)
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
logger.stream = { write: (msg) => logger.info(msg.trim()) };

// Morgan → Winston
app.use(morgan('combined', { stream: logger.stream }));

/** 5. Body parsing */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/** 6. Session management (persistent) */
const MongoStore = require('connect-mongo');
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
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

/** 8. MongoDB connection */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB connected'))
.catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

app.get('/healthz', async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  // readyState 1 = connected
  if (mongoState === 1) {
    return res.status(200).json({ status: 'OK', db: 'up' });
  }
  res.status(500).json({ status: 'ERROR', db: 'down' });
});


// Mount custom registration routes (if any)
const registerRoutes = require('./routes/register');
app.use('/', registerRoutes);

// Mount index routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Mount login routes
const loginRoutes = require('./routes/login');
app.use('/', loginRoutes);

// Mount dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/', dashboardRoutes);

// Mount admin management routes
const adminRoutes = require('./routes/admin');
app.use('/', adminRoutes);

// Implement a logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something went wrong!');
});


// Start the server
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}
