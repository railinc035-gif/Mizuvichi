const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// =====================================================
// FIREBASE
// =====================================================

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://webmanga-7b2cb-default-rtdb.firebaseio.com"
});

const db = admin.database();

// =====================================================
// CONFIGURACIÓN (RESEND)
// =====================================================

const RESEND_API_URL =
  "https://api.resend.com/emails";

const RESEND_API_KEY =
  process.env.RESEND_API_KEY;

const SENDER_EMAIL =
  process.env.EMAIL_FROM;

const WEBSITE_URL =
  "https://railinc035-gif.github.io/Mizuvichi/";

const DELAY_BETWEEN_EMAILS = 800;


// =====================================================
// UTILIDADES
// =====================================================

function esperar(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function obtenerCapitulos() {
  return fs
    .readdirSync("./")
    .filter(nombre => {
      const ruta = path.join("./", nombre);
      return (
        fs.statSync(ruta).isDirectory() &&
        nombre.startsWith("Cap_")
      );
    })
    .sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

function obtenerAvisos() {
  const rutaAvisos = "./Aviso";
  if (!fs.existsSync(rutaAvisos)) {
    return [];
  }
  return fs
    .readdirSync(rutaAvisos)
    .filter(nombre => {
      const extension = path.extname(nombre).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".webp"].includes(extension);
    })
    .sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true });
    });
}

function obtenerCorreos(subscribers) {
  const correos = Object.values(subscribers || {})
    .map(usuario => usuario?.email?.trim()?.toLowerCase())
    .filter(email => {
      if (!email) return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });

  return [...new Set(correos)];
}


// =====================================================
// DISEÑO PROFESIONAL DE PLANTILLAS
// =====================================================

function crearCorreoCapitulo(nombreCapitulo, enlace) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${nombreCapitulo} - Mizuvichi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #e2e8f0;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 40px 10px;">
    <tr>
      <td align="center">
        
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #16181e; border-radius: 12px; border: 1px solid #262933; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Encabezado / Logo -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #262933; background: linear-gradient(180deg, #1f222b 0%, #16181e 100%);">
              <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #ff3e3e; text-transform: uppercase; margin-bottom: 6px;">Oficial</span>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">MIZUVICHI</h1>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 36px 32px; text-align: left;">
              <div style="display: inline-block; background-color: rgba(255, 62, 62, 0.1); border-left: 3px solid #ff3e3e; padding: 4px 12px; border-radius: 0 4px 4px 0; margin-bottom: 20px;">
                <span style="font-size: 12px; font-weight: 600; color: #ff3e3e; text-transform: uppercase; letter-spacing: 1px;">Nuevo Capítulo</span>
              </div>
              
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ¡${nombreCapitulo} ya está disponible!
              </h2>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                La historia continúa. Ya puedes acceder al contenido más reciente directamente en la plataforma oficial de Mizuvichi.
              </p>

              <!-- Botón de Acción -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #ff3e3e;">
                    <a href="${enlace}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                      Leer capítulo ahora &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 24px 32px; background-color: #111216; border-top: 1px solid #262933; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Recibes este correo porque te suscribiste a las actualizaciones de Mizuvichi.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} Mizuvichi. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}


function crearCorreoAviso() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comunicado - Mizuvichi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #e2e8f0;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 40px 10px;">
    <tr>
      <td align="center">
        
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #16181e; border-radius: 12px; border: 1px solid #262933; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Encabezado / Logo -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #262933; background: linear-gradient(180deg, #1f222b 0%, #16181e 100%);">
              <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 3px; color: #10b981; text-transform: uppercase; margin-bottom: 6px;">Comunicado</span>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">MIZUVICHI</h1>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 36px 32px; text-align: left;">
              <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 4px 12px; border-radius: 0 4px 4px 0; margin-bottom: 20px;">
                <span style="font-size: 12px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 1px;">Actualización</span>
              </div>
              
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Nueva actualización del proyecto
              </h2>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Se ha publicado un nuevo comunicado oficial en la plataforma. Ingresa para enterarte de los últimos avances y novedades.
              </p>

              <!-- Botón de Acción -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10b981;">
                    <a href="${WEBSITE_URL}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #000000; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                      Ver aviso oficial &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 24px 32px; background-color: #111216; border-top: 1px solid #262933; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Recibes este correo porque te suscribiste a las novedades de Mizuvichi.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} Mizuvichi. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}


// =====================================================
// ENVIAR UN CORREO (RESEND)
// =====================================================

async function enviarUnoPorUno({ email, asunto, html, texto }) {
  await axios.post(
    RESEND_API_URL,
    {
      from: `Mizuvichi <${SENDER_EMAIL}>`,
      to: [email],
      subject: asunto,
      html: html,
      text: texto
    },
    {
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );
}


// =====================================================
// ENVIAR A TODOS
// =====================================================

async function enviarATodos(emails, asunto, html, texto) {
  let enviados = 0;
  let fallidos = 0;

  for (const email of emails) {
    try {
      console.log(`Enviando a: ${email}`);
      await enviarUnoPorUno({ email, asunto, html, texto });
      enviados++;
      console.log(`✓ Enviado correctamente`);
    } catch (error) {
      fallidos++;
      console.error(
        `✗ Error con ${email}:`,
        error.response?.data || error.message
      );
    }

    await esperar(DELAY_BETWEEN_EMAILS);
  }

  console.log(`\nResultado: ${enviados} enviados, ${fallidos} fallidos.`);
  return { enviados, fallidos };
}


// =====================================================
// PROCESO PRINCIPAL
// =====================================================

async function notify() {
  console.log("\n===== MIZUVICHI =====\n");

  const capitulos = obtenerCapitulos();
  const avisos = obtenerAvisos();
  const metaRef = db.ref("metadatos_envios");

  const snapshot = await metaRef.once("value");
  const metadata = snapshot.val() || { capitulos: [], avisos: [] };

  const capitulosAnteriores = Array.isArray(metadata.capitulos) ? metadata.capitulos : [];
  const avisosAnteriores = Array.isArray(metadata.avisos) ? metadata.avisos : [];

  const nuevosCaps = capitulos.filter(cap => !capitulosAnteriores.includes(cap));
  const nuevosAvisos = avisos.filter(aviso => !avisosAnteriores.includes(aviso));

  console.log(`Capítulos nuevos: ${nuevosCaps.length}`);
  console.log(`Avisos nuevos: ${nuevosAvisos.length}`);

  if (nuevosCaps.length === 0 && nuevosAvisos.length === 0) {
    console.log("No hay contenido nuevo.");
    return;
  }

  const subsSnapshot = await db.ref("subscriptores").once("value");
  const subscribers = subsSnapshot.val();
  const emails = obtenerCorreos(subscribers);

  console.log(`Suscriptores: ${emails.length}`);

  if (emails.length === 0) {
    console.log("No hay correos válidos.");
    return;
  }

  const capitulosEnviados = [];
  const avisosEnviados = [];

  // CAPÍTULOS
  for (const cap of nuevosCaps) {
    const nombreCap = cap.replace("Cap_", "Capítulo ");
    const enlace = `${WEBSITE_URL}#capitulo=${encodeURIComponent(cap)}`;
    const html = crearCorreoCapitulo(nombreCap, enlace);

    const resultado = await enviarATodos(
      emails,
      `📖 ${nombreCap} ya está disponible - Mizuvichi`,
      html,
      `${nombreCap} ya está disponible.\n\nLee el capítulo aquí: ${enlace}`
    );

    if (resultado.fallidos === 0) {
      capitulosEnviados.push(cap);
    }
  }

  // AVISOS
  for (const aviso of nuevosAvisos) {
    const html = crearCorreoAviso();

    const resultado = await enviarATodos(
      emails,
      "📢 Nueva actualización en Mizuvichi",
      html,
      `Hay un nuevo aviso oficial en Mizuvichi.\n\nVisita la web: ${WEBSITE_URL}`
    );

    if (resultado.fallidos === 0) {
      avisosEnviados.push(aviso);
    }
  }

  // GUARDAR ESTADO
  await metaRef.set({
    capitulos: [...capitulosAnteriores, ...capitulosEnviados],
    avisos: [...avisosAnteriores, ...avisosEnviados],
    ultimaActualizacion: Date.now()
  });

  console.log("\nProceso terminado.");
}

notify().catch(error => {
  console.error("\nERROR GENERAL:", error);
  process.exit(1);
});
