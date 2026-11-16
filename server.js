const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: ".env.local" });

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
app.set("trust proxy", 1);
app.use(cors({
  origin: [
    "https://topguest-events.pages.dev",
    "https://topguestevents.com.ng",
    "https://www.topguestevents.com.ng"
  ],
  credentials: true
}));
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
      secure: true,
      sameSite: "none",
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

// RENTALS INVENTORY API

// Get all rental items (public)
app.get("/api/inventory", async (req, res) => {
  const { data, error } = await supabase
    .from("rentals_inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: "Unable to load inventory." });
  }

  res.json(data);
});

// Add rental item (admin only)
app.post("/api/inventory", requireAdmin, async (req, res) => {
  const item = {
    id: req.body.id || require("crypto").randomUUID(),
    name: req.body.name,
    sku: req.body.sku || "",
    category: req.body.category || "",
    price: Number(req.body.price) || 0,
    total: Number(req.body.total) || 0,
    out: Number(req.body.out) || 0,
    pending: Number(req.body.pending) || 0,
    image: req.body.image || ""
  };

  if (!item.name) {
    return res.status(400).json({ message: "Item name is required." });
  }

  const { data, error } = await supabase
    .from("rentals_inventory")
    .insert(item)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: "Unable to add item." });
  }

  res.status(201).json(data);
});

// Update rental item (admin only)
app.patch("/api/inventory/:id", requireAdmin, async (req, res) => {
  const allowed = ["name", "sku", "category", "price", "total", "out", "pending", "image"];
  const patch = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("rentals_inventory")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: "Unable to update item." });
  }

  res.json(data);
});

// Delete rental item (admin only)
app.delete("/api/inventory/:id", requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from("rentals_inventory")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ message: "Unable to delete item." });
  }

  res.json({ success: true });
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