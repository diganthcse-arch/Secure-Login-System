import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verifySync } from "otplib";
import qrcode from "qrcode";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure local persistence data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorTempSecret?: string; // stored during 2fa activation setup
  failedAttempts: number;
  lockoutUntil: number | null;
  createdAt: string;
}

interface DBLog {
  id: string;
  userId: string | null;
  email: string;
  timestamp: string;
  action: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | '2FA_ENABLED' | '2FA_DISABLED' | '2FA_VERIFIED' | 'LOCKOUT' | 'SQL_INJECTION_ATTEMPT';
  ipAddress: string;
  userAgent: string;
  details: string;
}

interface DBStructure {
  users: DBUser[];
  logs: DBLog[];
}

// Initial DB setup
function loadDB(): DBStructure {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB: DBStructure = { users: [], logs: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    return { users: [], logs: [] };
  }
}

function saveDB(data: DBStructure) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Security secret initialization
const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secure-jwt-secret-key-1337-2026";
const TEMP_JWT_SECRET = process.env.TEMP_JWT_SECRET || "fallback-temp-secret-key-42";

// Utility to create security audit logs
function createAuditLog(
  userId: string | null,
  email: string,
  action: DBLog['action'],
  ip: string,
  ua: string,
  details: string
) {
  const db = loadDB();
  const newLog: DBLog = {
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    email,
    timestamp: new Date().toISOString(),
    action,
    ipAddress: ip || "unknown",
    userAgent: ua || "unknown",
    details
  };
  db.logs.push(newLog);
  // Keep logs at a reasonable size (last 1000 logs)
  if (db.logs.length > 1000) {
    db.logs.shift();
  }
  saveDB(db);
  return newLog;
}

// --- Parameterized SQL Query Mock for Security & SQLi Defense Demonstration ---
// To prove protection from SQL injection, we mock a database query interface.
// Users can enter raw input in a 'Vulnerability Sandbox' in the UI to see how
// parameterized queries strictly separate code from data, preventing SQL injection,
// whereas a naive string concatenation would execute arbitrary database commands.
export function executeSecureQuery(sql: string, params: any[]): DBUser[] {
  const db = loadDB();
  
  // Basic simulation of: SELECT * FROM users WHERE email = $1
  if (sql.includes("WHERE email = $1")) {
    const emailToFind = params[0]?.toLowerCase().trim();
    return db.users.filter(u => u.email === emailToFind);
  }
  
  // Fetch by id: SELECT * FROM users WHERE id = $1
  if (sql.includes("WHERE id = $1")) {
    const idToFind = params[0];
    return db.users.filter(u => u.id === idToFind);
  }

  return [];
}

// Insecure implementation for comparison and educational demonstration
export function executeInsecureQuery(sqlWithInjectedStrings: string): { results: any[]; error?: string; logBlocked?: boolean } {
  const db = loadDB();
  
  // A naive raw SQL template execution:
  // e.g., SELECT * FROM users WHERE email = '${email}'
  // If the user inputs: admin@example.com' OR '1'='1
  // The query becomes: SELECT * FROM users WHERE email = 'admin@example.com' OR '1'='1'
  // Let's implement a safe, exact parsing of this to simulate SQL injection results!
  
  const match = sqlWithInjectedStrings.match(/WHERE email = '(.*)'/i);
  if (!match) {
    return { results: [], error: "Unsupported query syntax in educational simulation" };
  }
  
  const rawValue = match[1];
  
  // Detect SQL Injection attempts
  const sqliPatterns = [
    /'\s*or\s*/i,
    /--/i,
    /union\s+select/i,
    /'\s*=\s*'/i,
    /1\s*=\s*1/
  ];
  
  const isAttack = sqliPatterns.some(pattern => pattern.test(rawValue));
  
  if (isAttack) {
    // If it's a simulated attack, we'll return all users (just like a real SQL injection would return all matching records in 'OR 1=1'!)
    // But we'll sanitize password hashes in the output so secrets are never leaked even in simulated mode!
    const leakedUsers = db.users.map(u => ({
      id: u.id,
      email: u.email,
      passwordHash: "[REDACTED_SECURE_HASH]",
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt
    }));
    return { results: leakedUsers, logBlocked: false };
  } else {
    // Normal exact filter
    const matched = db.users.filter(u => u.email === rawValue.toLowerCase().trim());
    return { results: matched };
  }
}

app.use(express.json());
app.use(cookieParser());

// Custom Security Headers middleware
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Enable XSS protection filter in older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Content Security Policy (strict script controls)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
  );
  next();
});

// Helper: Get IP Address
function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress;
  return ip || "127.0.0.1";
}

// Authentication Middleware
interface AuthenticatedRequest extends express.Request {
  user?: DBUser;
}

const requireAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.session_token;
  if (!token) {
    res.status(401).json({ success: false, error: "Access denied. Please log in." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = loadDB();
    const user = db.users.find(u => u.id === decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, error: "User session expired or user no longer exists." });
      return;
    }

    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      res.status(403).json({ success: false, error: "Account is temporarily locked." });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid session token. Please log in again." });
  }
};

// --- AUTHENTICATION API ROUTES ---

// 1. REGISTER
app.post("/api/auth/register", async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  // Check SQL injection pattern in registry input to demonstrate monitoring
  const sqlInjectionPattern = /('\s*or\s*|--|union\s+select)/i;
  if (sqlInjectionPattern.test(email) || sqlInjectionPattern.test(password)) {
    createAuditLog(null, email || "unknown", 'SQL_INJECTION_ATTEMPT', ip, ua, `SQL Injection vector detected in registration email/password field`);
    res.status(400).json({
      success: false,
      error: "Potential security threat detected. Form submission blocked."
    });
    return;
  }

  // Basic Validation
  if (!email || !password || !confirmPassword) {
    res.status(400).json({ success: false, error: "All registration fields are required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, error: "Please enter a valid email address." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, error: "Password must be at least 8 characters long." });
    return;
  }

  // Password complexity: at least one letter, one number, and one special character
  const complexityRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!complexityRegex.test(password)) {
    res.status(400).json({
      success: false,
      error: "Password must contain at least one letter, one number, and one special character (@$!%*#?&)."
    });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ success: false, error: "Passwords do not match." });
    return;
  }

  try {
    const db = loadDB();

    // Secure search using parameterized logic
    const existingUsers = executeSecureQuery("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUsers.length > 0) {
      res.status(400).json({ success: false, error: "An account with this email already exists." });
      return;
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser: DBUser = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase().trim(),
      passwordHash,
      twoFactorEnabled: false,
      failedAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDB(db);

    createAuditLog(newUser.id, newUser.email, 'REGISTER', ip, ua, `User registered successfully`);

    res.status(201).json({
      success: true,
      message: "Registration successful! You can now log in securely."
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, error: "An unexpected error occurred during registration." });
  }
});

// 2. LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  // Check SQL injection pattern
  const sqlInjectionPattern = /('\s*or\s*|--|union\s+select)/i;
  if (sqlInjectionPattern.test(email) || sqlInjectionPattern.test(password)) {
    createAuditLog(null, email || "unknown", 'SQL_INJECTION_ATTEMPT', ip, ua, `SQL Injection vector detected in login fields`);
    res.status(400).json({
      success: false,
      error: "Potential security threat detected. Login attempt blocked."
    });
    return;
  }

  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required." });
    return;
  }

  try {
    const db = loadDB();
    
    // Secure Parameterized Query
    const users = executeSecureQuery("SELECT * FROM users WHERE email = $1", [email]);
    const user = users[0];

    if (!user) {
      // Avoid leaking account existence to prevent username enumeration, but log the failure
      createAuditLog(null, email, 'LOGIN_FAILED', ip, ua, `Failed login: User not found`);
      res.status(401).json({ success: false, error: "Invalid email or password." });
      return;
    }

    // Brute Force Lockout Check
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
      res.status(429).json({
        success: false,
        error: `Account is temporarily locked due to too many failed attempts. Try again in ${remainingTime} seconds.`
      });
      return;
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      user.failedAttempts += 1;
      let lockoutMessage = "";
      
      // Lock account after 5 failed attempts
      if (user.failedAttempts >= 5) {
        const lockoutDuration = 30 * 1000; // 30 seconds lockout for demo purposes
        user.lockoutUntil = Date.now() + lockoutDuration;
        user.failedAttempts = 0; // reset counter after locking
        lockoutMessage = " Account locked for 30 seconds.";
        createAuditLog(user.id, user.email, 'LOCKOUT', ip, ua, `Account locked due to 5 consecutive login failures`);
      } else {
        createAuditLog(user.id, user.email, 'LOGIN_FAILED', ip, ua, `Incorrect password attempt (${user.failedAttempts}/5)`);
      }
      
      // Persist failed attempts
      const userIndex = db.users.findIndex(u => u.id === user.id);
      db.users[userIndex] = user;
      saveDB(db);

      res.status(401).json({
        success: false,
        error: `Invalid email or password.${lockoutMessage}`
      });
      return;
    }

    // Success: Reset failed attempts
    user.failedAttempts = 0;
    user.lockoutUntil = null;
    const userIndex = db.users.findIndex(u => u.id === user.id);
    db.users[userIndex] = user;
    saveDB(db);

    // Two Factor Authentication Check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Issue a short-lived temporary token to verify 2FA
      const tempToken = jwt.sign({ userId: user.id }, TEMP_JWT_SECRET, { expiresIn: "5m" });
      
      res.json({
        success: true,
        requires2FA: true,
        tempToken,
        message: "2FA verification required."
      });
      return;
    }

    // Issue Full Session Cookie
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    
    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000 // 1 hour
    });

    createAuditLog(user.id, user.email, 'LOGIN_SUCCESS', ip, ua, `User logged in successfully`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "An unexpected error occurred during login." });
  }
});

// 3. VERIFY 2FA (During Login Flow)
app.post("/api/auth/verify-2fa", async (req, res) => {
  const { code, tempToken } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  if (!code || !tempToken) {
    res.status(400).json({ success: false, error: "Validation code and temporary token are required." });
    return;
  }

  try {
    // Verify temporary JWT token
    const decoded = jwt.verify(tempToken, TEMP_JWT_SECRET) as { userId: string };
    const db = loadDB();
    const user = db.users.find(u => u.id === decoded.userId);

    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: "Invalid or expired session. Please log in again." });
      return;
    }

    // Verify TOTP token
    const verified = verifySync({
      token: code,
      secret: user.twoFactorSecret
    }).valid;

    if (!verified) {
      createAuditLog(user.id, user.email, 'LOGIN_FAILED', ip, ua, `2FA Verification failed: Invalid passcode`);
      res.status(401).json({ success: false, error: "Invalid code. Please try again." });
      return;
    }

    // Success: Issue session token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    
    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000 // 1 hour
    });

    createAuditLog(user.id, user.email, 'LOGIN_SUCCESS', ip, ua, `User logged in with 2FA successfully`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (err) {
    res.status(401).json({ success: false, error: "Temporary token expired or invalid. Please try again." });
  }
});

// 4. LOGOUT
app.post("/api/auth/logout", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  res.clearCookie("session_token");
  createAuditLog(user.id, user.email, 'LOGOUT', ip, ua, `User logged out`);
  res.json({ success: true, message: "Logged out successfully." });
});

// 5. CURRENT USER STATE
app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      twoFactorEnabled: user.twoFactorEnabled
    }
  });
});

// 6. 2FA SETUP (INITIATE)
app.post("/api/auth/2fa/setup", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  try {
    const db = loadDB();
    const secret = generateSecret();
    const otpauth = generateURI({ secret, label: user.email, issuer: "Secure Login App" });

    // Save temporary secret during configuration
    const userIndex = db.users.findIndex(u => u.id === user.id);
    db.users[userIndex].twoFactorTempSecret = secret;
    saveDB(db);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    res.json({
      success: true,
      secret,
      qrCodeDataUrl,
      message: "Scan this QR code with an Authenticator app (like Google Authenticator)."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to generate 2FA credentials." });
  }
});

// 7. 2FA SETUP (CONFIRM & ENABLE)
app.post("/api/auth/2fa/confirm", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { code } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  if (!code) {
    res.status(400).json({ success: false, error: "Validation code is required." });
    return;
  }

  try {
    const db = loadDB();
    const currentUser = db.users.find(u => u.id === user.id);

    if (!currentUser || !currentUser.twoFactorTempSecret) {
      res.status(400).json({ success: false, error: "2FA setup has not been initiated." });
      return;
    }

    const verified = verifySync({
      token: code,
      secret: currentUser.twoFactorTempSecret
    }).valid;

    if (!verified) {
      res.status(400).json({ success: false, error: "Invalid validation code. Double check your authenticator." });
      return;
    }

    // Promote temp secret to active
    currentUser.twoFactorSecret = currentUser.twoFactorTempSecret;
    currentUser.twoFactorEnabled = true;
    delete currentUser.twoFactorTempSecret;

    const userIndex = db.users.findIndex(u => u.id === user.id);
    db.users[userIndex] = currentUser;
    saveDB(db);

    createAuditLog(user.id, user.email, '2FA_ENABLED', ip, ua, `Two-Factor Authentication enabled`);

    res.json({
      success: true,
      message: "Two-Factor Authentication activated successfully!"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to activate 2FA." });
  }
});

// 8. 2FA DISABLE
app.post("/api/auth/2fa/disable", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { code } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "unknown";

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ success: false, error: "2FA is not enabled for this account." });
    return;
  }

  if (!code) {
    res.status(400).json({ success: false, error: "Code is required to disable 2FA." });
    return;
  }

  const verified = verifySync({
    token: code,
    secret: user.twoFactorSecret
  }).valid;

  if (!verified) {
    res.status(400).json({ success: false, error: "Invalid authentication code. Action denied." });
    return;
  }

  const db = loadDB();
  const currentUser = db.users.find(u => u.id === user.id);
  if (currentUser) {
    currentUser.twoFactorEnabled = false;
    currentUser.twoFactorSecret = undefined;
    currentUser.twoFactorTempSecret = undefined;
    
    const userIndex = db.users.findIndex(u => u.id === user.id);
    db.users[userIndex] = currentUser;
    saveDB(db);
  }

  createAuditLog(user.id, user.email, '2FA_DISABLED', ip, ua, `Two-Factor Authentication disabled`);

  res.json({
    success: true,
    message: "Two-Factor Authentication has been successfully disabled."
  });
});

// 9. SECURITY LOGS
app.get("/api/auth/logs", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = loadDB();
  
  // Return logs specific to this user or their email
  const userLogs = db.logs
    .filter(log => log.userId === user.id || log.email === user.email)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    success: true,
    logs: userLogs
  });
});

// 10. EDUCATIONAL SQL INJECTION SANDBOX API
// This allows testing normal vs injected SQL queries in a safe environment, displaying how parameterization protects users.
app.post("/api/security-demo/query", (req, res) => {
  const { queryText, useParameterization, paramValue } = req.body;
  
  if (!queryText) {
    res.status(400).json({ success: false, error: "Query code or text is required." });
    return;
  }

  if (useParameterization) {
    // Show how parameterized queries protect
    // The placeholder value is safely passed as $1
    const results = executeSecureQuery(queryText, [paramValue]);
    res.json({
      success: true,
      queryExecuted: `executeSecureQuery("${queryText}", ["${paramValue}"])`,
      results,
      vulnerable: false,
      details: "Secure: Parameterization binds the input value strictly as a literal. The database cannot execute any malicious injection symbols because the value is never evaluated as code."
    });
  } else {
    // Show what happens in an insecure concatenated query
    const sqlConcatenated = queryText.replace("$1", `'${paramValue}'`);
    const { results, logBlocked } = executeInsecureQuery(sqlConcatenated);
    
    const isAttack = /('\s*or\s*|--|union\s+select)/i.test(paramValue);
    if (isAttack) {
      createAuditLog(
        null,
        "sandbox_user",
        'SQL_INJECTION_ATTEMPT',
        getClientIp(req),
        req.headers["user-agent"] || "unknown",
        `Vulnerability Demonstration: SQL Injection triggered via query simulation`
      );
    }

    res.json({
      success: true,
      queryExecuted: sqlConcatenated,
      results,
      vulnerable: true,
      details: isAttack 
        ? "VULNERABLE (Simulated): String concatenation allowed the SQL injection pattern to be executed! The statement was modified, matching ALL users and exposing internal database attributes."
        : "VULNERABLE: Direct string concatenation is used here. While this specific input was clean, a hacker could easily execute an injection payload (e.g. admin@example.com' OR '1'='1) to retrieve confidential files or alter permissions."
    });
  }
});


// --- VITE DEV SERVER MIDDLEWARE / PRODUCTION STATIC ROUTING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SECURE SERVER] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
