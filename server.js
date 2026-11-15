const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3000;

if (
  !process.env.ADMIN_EMAIL ||
  !process.env.ADMIN_PASSWORD_HASH ||
  !process.env.SESSION_SECRET
) {
  console.error("Missing authentication settings in .env.local");
  process.exit(1);
}

app.use(express.json({ limit: "10kb" }));

app.use(
  session({
    name: "topguest_admin_session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    }
  })
);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.redirect("/login.html");
}

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Enter your email and password."
      });
    }

    const emailMatches =
      email.trim().toLowerCase() ===
      process.env.ADMIN_EMAIL.trim().toLowerCase();

    const passwordMatches = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({
          message: "Unable to start your session."
        });
      }

      req.session.isAdmin = true;

      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({
            message: "Unable to save your session."
          });
        }

        return res.json({
          success: true,
          message: "Login successful."
        });
      });
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "A server error occurred."
    });
  }
});

// Admin logout
app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("topguest_admin_session");
    res.json({ success: true });
  });
});

// Protect the dashboard before serving static files
app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Serve the existing website
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`TOPGUEST EVENTS running at http://localhost:${PORT}`);
});