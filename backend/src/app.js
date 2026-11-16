const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const certificateTypeRoutes = require('./routes/certificateTypeRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const certificateFormatRoutes = require('./routes/certificateFormatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const publicRoutes = require('./routes/publicRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS setup supporting credentials (for HttpOnly cookies from Angular frontend)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, SSR server)
    if (!origin) return callback(null, true);
    if (config.CORS_ORIGIN.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for local dev & SSR
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(cookieParser());
// Base64 uploads (photos/documents) arrive inline in JSON bodies
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Uploaded files (candidate photos, user photos, candidate documents)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Uploaded files are stored as relative paths (/uploads/...). Browsers load them from the
// API origin, so rewrite them to absolute URLs in every JSON response — one place, so every
// <img> / <a href> in the frontend works on any port or host.
app.use((req, res, next) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const absolutize = (value) => {
    if (typeof value === 'string') {
      return value.startsWith('/uploads/') ? origin + value : value;
    }
    if (Array.isArray(value)) {
      value.forEach(absolutize);
    } else if (value && typeof value === 'object') {
      Object.keys(value).forEach((k) => { value[k] = absolutize(value[k]); });
    }
    return value;
  };
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(absolutize(body));
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'EmiSafe REST API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/certificate-types', certificateTypeRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/certificate-formats', certificateFormatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);

// Catch 404 for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;

