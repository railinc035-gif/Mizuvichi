const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// =====================================================
// BÚSQUEDA AUTÓNOMA DE CREDENCIALES FIREBASE
// =====================================================

function obtenerServiceAccount() {
  // 1. Intentar leer la variable de entorno de GitHub Actions / servidor
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn("⚠️ Error parsing FIREBASE_SERVICE_ACCOUNT_JSON env variable.");
    }
  }

  // 2. Buscar dinámicamente cualquier archivo .json de credenciales en la raíz o subcarpetas
  function buscarJsonServiceAccount(dir) {
    const archivos = fs.readdirSync(dir);
    for (const archivo of archivos) {
      if (archivo === "node_modules" || archivo.startsWith(".")) continue;
      const rutaCompleta = path.join(dir, archivo);
      const stat = fs.statSync(rutaCompleta);

      if (stat.isDirectory()) {
        const resultado = buscarJsonServiceAccount(rutaCompleta);
        if (resultado) return resultado;
      } else if (archivo.endsWith(".json")) {
        try {
          const contenido = JSON.parse(fs.readFileSync(rutaCompleta, "utf8"));
          if (contenido.type === "service_account" || contenido.project_id) {
            console.log(`📌 Credenciales de Firebase encontradas en: ${rutaCompleta}`);
            return contenido;
          }
        } catch (e) {
          // Si no es un JSON válido o no se puede leer, ignorar
        }
      }
    }
    return null;
  }

  const encontrado = buscarJsonServiceAccount(process.cwd());
  if (encontrado) return encontrado;

  throw new Error("❌ No se encontraron credenciales de Firebase válidas ni en variables de entorno ni en archivos .json del proyecto.");
}

// Inicialización de Firebase Admin
const serviceAccount = obtenerServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webmanga-7b2cb-default-rtdb.firebaseio.com"
});

const db = admin.database();

// =====================================================
// CONFIGURACIÓN (GMAIL / NODEMAILER)
// =====================================================

const WEBSITE_URL = "https://railinc035-gif.github.io/Mizuvichi/";
const DELAY_BETWEEN_EMAILS = 800;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// =====================================================
// BÚSQUEDA DINÁMICA DE CAPÍTULOS Y AVISOS
// =====================================================

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Busca carpetas 'Cap_' en cualquier nivel del proyecto
function obtenerCapitulosDinamico(dir = process.cwd()) {
  let capitulos = [];
  const elementos = fs.readdirSync(dir);

  for (const item of elementos) {
    if (item === "node_modules" || item.startsWith(".")) continue;
    const ruta = path.join(dir, item);
    const stat = fs.statSync(ruta);

    if (stat.isDirectory()) {
      if (item.toLowerCase().startsWith("cap_")) {
        capitulos.push(item);
      } else {
        capitulos = capitulos.concat(obtenerCapitulosDinamico(ruta));
      }
    }
  }

  return [...new Set(capitulos)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Busca imágenes en carpetas de avisos en cualquier nivel del proyecto
function obtenerAvisosDinamico(dir = process.cwd()) {
  let avisos = [];
  const elementos = fs.readdirSync(dir);

  for (const item of elementos) {
    if (item === "node_modules" || item.startsWith(".")) continue;
    const ruta = path.join(dir, item);
    const stat = fs.statSync(ruta);

    if (stat.isDirectory()) {
      if (item.toLowerCase().includes("aviso")) {
        const fotos = fs.readdirSync(ruta).filter(f => {
          const ext = path.extname(f).toLowerCase();
          return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
        });
        avisos = avisos.concat(fotos);
      } else {
        avisos = avisos.concat(obtenerAvisosDinamico(ruta));
      }
    }
  }

  return [...new Set(avisos)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function obtenerCorreos(subscribers) {
  const correos = Object.values(subscribers || {})
    .map(usuario => usuario?.email?.trim()?.toLowerCase())
    .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return [...new Set(correos)];
}

// =====================================================
// PLANTILLAS HTML
// =====================================================

function crearCorreoCapitulo(nombreCapitulo, enlace) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 40px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #16181e; border-radius: 12px; border: 1px solid #262933; overflow: hidden;">
        <tr><td align="center" style="padding: 32px; border-bottom: 1px solid #262933; background: #1f222b;">
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #ff3e3e; text-transform: uppercase;">Oficial</span>
          <h1 style="margin: 6px 0 0 0; font-size: 26px; color: #ffffff;">MIZUVICHI</h1>
        </td></tr>
        <tr><td style="padding: 36px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #ffffff;">¡${nombreCapitulo} ya está disponible!</h2>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">La historia continúa. Puedes acceder al capítulo más reciente en Mizuvichi.</p>
          <a href="${enlace}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #ff3e3e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Leer capítulo ahora &rarr;</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function crearCorreoAviso() {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 40px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #16181e; border-radius: 12px; border: 1px solid #262933; overflow: hidden;">
        <tr><td align="center" style="padding: 32px; border-bottom: 1px solid #262933; background: #1f222b;">
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #10b981; text-transform: uppercase;">Comunicado</span>
          <h1 style="margin: 6px 0 0 0; font-size: 26px; color: #ffffff;">MIZUVICHI</h1>
        </td></tr>
        <tr><td style="padding: 36px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #ffffff;">Nueva actualización del proyecto</h2>
          <p style="margin: 0 0 28px 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">Se ha publicado un nuevo comunicado en la plataforma.</p>
          <a href="${WEBSITE_URL}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver aviso oficial &rarr;</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// =====================================================
// ENVÍO DE CORREOS
// =====================================================

async function enviarATodos(emails, asunto, html, texto) {
  let enviados = 0, fallidos = 0;

  for (const email of emails) {
    try {
      console.log(`Enviando a: ${email}`);
      await transporter.sendMail({
        from: `"Mizuvichi" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: asunto,
        text: texto,
        html: html
      });
      enviados++;
      console.log(`✓ Enviado`);
    } catch (error) {
      fallidos++;
      console.error(`✗ Error enviando a ${email}:`, error.message);
    }
    await esperar(DELAY_BETWEEN_EMAILS);
  }

  return { enviados, fallidos };
}

// =====================================================
// EJECUCIÓN PRINCIPAL
// =====================================================

async function notify() {
  console.log("\n===== MIZUVICHI =====\n");

  const capitulos = obtenerCapitulosDinamico();
  const avisos = obtenerAvisosDinamico();
  const metaRef = db.ref("metadatos_envios");

  const snapshot = await metaRef.once("value");
  const metadata = snapshot.val() || { capitulos: [], avisos: [] };

  const capitulosAnteriores = Array.isArray(metadata.capitulos) ? metadata.capitulos : [];
  const avisosAnteriores = Array.isArray(metadata.avisos) ? metadata.avisos : [];

  const nuevosCaps = capitulos.filter(cap => !capitulosAnteriores.includes(cap));
  const nuevosAvisos = avisos.filter(aviso => !avisosAnteriores.includes(aviso));

  console.log(`Capítulos nuevos detectados: ${nuevosCaps.length}`);
  console.log(`Avisos nuevos detectados: ${nuevosAvisos.length}`);

  if (nuevosCaps.length === 0 && nuevosAvisos.length === 0) {
    console.log("No hay contenido nuevo que notificar.");
    return;
  }

  const subsSnapshot = await db.ref("subscriptores").once("value");
  const subscribers = subsSnapshot.val();
  const emails = obtenerCorreos(subscribers);

  console.log(`Suscriptores a notificar: ${emails.length}`);

  if (emails.length === 0) {
    console.log("No hay correos registrados en la base de datos.");
    return;
  }

  const capitulosEnviados = [];
  const avisosEnviados = [];

  for (const cap of nuevosCaps) {
    const nombreCap = cap.replace("Cap_", "Capítulo ");
    const enlace = `${WEBSITE_URL}#capitulo=${encodeURIComponent(cap)}`;
    const html = crearCorreoCapitulo(nombreCap, enlace);

    const res = await enviarATodos(
      emails,
      `📖 ${nombreCap} ya está disponible - Mizuvichi`,
      html,
      `${nombreCap} ya está disponible.\n\nLee el capítulo aquí: ${enlace}`
    );

    if (res.fallidos === 0) capitulosEnviados.push(cap);
  }

  for (const aviso of nuevosAvisos) {
    const html = crearCorreoAviso();

    const res = await enviarATodos(
      emails,
      "📢 Nueva actualización en Mizuvichi",
      html,
      `Hay un nuevo aviso oficial en Mizuvichi.\n\nVisita la web: ${WEBSITE_URL}`
    );

    if (res.fallidos === 0) avisosEnviados.push(aviso);
  }

  await metaRef.set({
    capitulos: [...capitulosAnteriores, ...capitulosEnviados],
    avisos: [...avisosAnteriores, ...avisosEnviados],
    ultimaActualizacion: Date.now()
  });

  console.log("\nProceso finalizado con éxito.");
}

notify().catch(error => {
  console.error("\nERROR GENERAL:", error);
  process.exit(1);
});
