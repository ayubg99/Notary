import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/contact", async (req, res) => {
    const { name, phone, email, service, lang, message } = req.body;

    console.log("New Lead Received:", { name, phone, email, service, lang, message });

    // SMTP configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    try {
      // Only attempt to send if SMTP settings are provided
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport(smtpConfig);

        await transporter.sendMail({
          from: `"Notaría Diego Simó" <${process.env.SMTP_USER}>`,
          to: "info@notariadiegosimo.es", // The client's email
          subject: `Nueva solicitud de cita: ${name}`,
          text: `
            Nueva solicitud de cita desde la web:
            
            Nombre: ${name}
            Teléfono: ${phone}
            Email: ${email || "No proporcionado"}
            Servicio: ${service || "No especificado"}
            Idioma: ${lang}
            Mensaje: ${message || "Sin mensaje"}
          `,
          html: `
            <h2>Nueva solicitud de cita</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Teléfono:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email || "No proporcionado"}</p>
            <p><strong>Servicio:</strong> ${service || "No especificado"}</p>
            <p><strong>Idioma:</strong> ${lang}</p>
            <p><strong>Mensaje:</strong> ${message || "Sin mensaje"}</p>
          `,
        });
        
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        // Log to console if no SMTP configured - useful for development/preview
        console.warn("SMTP not configured. Message logged above but no email was sent.");
        res.json({ 
          success: true, 
          message: "Data received and logged (SMTP not configured)", 
          debug: { name, phone, email, service, lang, message }
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, message: "Failed to send lead" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
