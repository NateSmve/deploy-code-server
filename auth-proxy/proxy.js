const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const admin = require('firebase-admin');

const app = express();
app.use(cookieParser());

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString())
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} else {
  console.error('No Firebase credentials found!');
  process.exit(1);
}

const db = admin.firestore();

// Config
const AUTH_PORTAL_URL = process.env.AUTH_PORTAL_URL || 'https://auth.pandawsu.com';
const CODE_SERVER_URL = process.env.CODE_SERVER_INTERNAL_URL || 'http://localhost:8081';
const ALLOWED_ROLES = ['admin', 'dev'];
const SESSION_COOKIE_NAME = 'session'; // Match your auth portal's cookie name

// Auth middleware
async function authMiddleware(req, res, next) {
  const sessionCookie = req.cookies[SESSION_COOKIE_NAME];

  // No session cookie - redirect to auth
  if (!sessionCookie) {
    console.log('No session cookie, redirecting to auth');
    return redirectToAuth(req, res);
  }

  try {
    // Verify the session cookie
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Get user from Firestore to check role
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.log(`User ${uid} not found in Firestore`);
      return redirectToAuth(req, res);
    }

    const userData = userDoc.data();
    const userRole = userData.role || userData.roles?.[0] || 'customer';

    // Check if user has allowed role
    if (!ALLOWED_ROLES.includes(userRole)) {
      console.log(`User ${uid} has role "${userRole}", access denied`);
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #1e1e1e;
              color: #fff;
            }
            .container { text-align: center; }
            h1 { color: #ff6b6b; }
            p { color: #aaa; }
            a { color: #4dabf7; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Access Denied</h1>
            <p>You need <strong>admin</strong> or <strong>dev</strong> role to access code-server.</p>
            <p>Your current role: <strong>${userRole}</strong></p>
            <p><a href="${AUTH_PORTAL_URL}">Return to login</a></p>
          </div>
        </body>
        </html>
      `);
    }

    // User authenticated with valid role
    console.log(`User ${uid} (${userData.email}) authenticated with role "${userRole}"`);
    req.user = { uid, email: userData.email, role: userRole };
    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return redirectToAuth(req, res);
  }
}

function redirectToAuth(req, res) {
  const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const redirectUrl = `${AUTH_PORTAL_URL}/login?redirect=${encodeURIComponent(currentUrl)}`;
  return res.redirect(redirectUrl);
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'code-server-auth-proxy' });
});

// Apply auth middleware to all other routes
app.use(authMiddleware);

// Proxy to code-server
app.use(
  '/',
  createProxyMiddleware({
    target: CODE_SERVER_URL,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying (critical for code-server)
    onProxyReq: (proxyReq, req) => {
      // Pass user info to code-server if needed
      if (req.user) {
        proxyReq.setHeader('X-User-Email', req.user.email);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).send('code-server is starting up, please wait...');
    },
  })
);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth proxy listening on port ${PORT}`);
  console.log(`Proxying to code-server at ${CODE_SERVER_URL}`);
  console.log(`Auth portal: ${AUTH_PORTAL_URL}`);
  console.log(`Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
});
