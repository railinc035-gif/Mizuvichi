const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webmanga-7b2cb-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function notify() {
  console.log("Iniciando escaneo de contenido...");

  const repoPath = './';
  const folders = fs.readdirSync(repoPath).filter(f => 
    fs.statSync(path.join(repoPath, f)).isDirectory() && f.startsWith('Cap_')
  );

  const avisoPath = './Aviso';
  let avisos = [];
  if (fs.existsSync(avisoPath)) {
    avisos = fs.readdirSync(avisoPath).filter(f => f.toLowerCase().endsWith('.png'));
  }

  const metaRef = db.ref('metadatos_envios');
  const snapshot = await metaRef.once('value');
  const metadata = snapshot.val() || { capitulos: [], avisos: [] };

  const nuevosCaps = folders.filter(f => !metadata.capitulos.includes(f));
  const nuevosAvisos = avisos.filter(a => !metadata.avisos.includes(a));

  if (nuevosCaps.length === 0 && nuevosAvisos.length === 0) {
    console.log("No hay contenido nuevo para notificar.");
    process.exit(0);
  }

  const subsSnapshot = await db.ref('subscriptores').once('value');
  const subscribers = subsSnapshot.val();
  if (!subscribers) {
    console.log("No hay suscriptores registrados.");
    process.exit(0);
  }

  const emailList = Object.values(subscribers).map(s => ({ email: s.email }));
  const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.EMAIL_FROM;

  // Función para enviar correos en bloques de 95 para respetar límites y privacidad (usando BCC)
  const enviarBloque = async (destinatarios, subject, htmlContent) => {
    try {
      await axios.post(BREVO_API_URL, {
        sender: { name: "Thalesis Manga", email: SENDER_EMAIL },
        to: [{ email: SENDER_EMAIL }], // Enviamos "para nosotros"
        bcc: destinatarios,           // El resto va oculto por privacidad
        subject: subject,
        htmlContent: htmlContent
      }, {
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error(`Error enviando bloque: ${e.response ? e.response.data.message : e.message}`);
    }
  };

  const procesarEnvioMasivo = async (subject, htmlContent) => {
    for (let i = 0; i < emailList.length; i += 95) {
      const bloque = emailList.slice(i, i + 95);
      await enviarBloque(bloque, subject, htmlContent);
    }
  };

  for (const cap of nuevosCaps) {
    const nombreCap = cap.replace('Cap_', 'Capítulo ');
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0c10; color: #ffffff; padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto; border: 2px solid #1f2833; border-radius: 12px;">
        <h1 style="color: #ff0055; font-size: 2.5rem; letter-spacing: 2px; margin-bottom: 5px; text-transform: uppercase; font-weight: 900;">THALESIS</h1>
        <p style="color: #66fcf1; font-size: 1rem; margin-top: 0; font-style: italic; letter-spacing: 1px;">Por Raylin AC</p>
        <hr style="border: 0; border-top: 1px solid #1f2833; margin: 30px 0;">
        <h2 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin-bottom: 15px;">¡Las páginas ya están listas, lector!</h2>
        <p style="color: #c5c6c7; font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">
          La historia continúa. El nuevo <strong style="color: #ff0055; font-size: 1.2rem;">${nombreCap}</strong> acaba de ser publicado de forma independiente en nuestra web oficial.
        </p>
        <div style="margin: 40px 0;">
          <a href="https://railinc035-gif.github.io/Mizuvichi/#capitulo=${cap}" 
             style="background-color: #ff0055; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1.2rem; display: inline-block; box-shadow: 0 4px 15px rgba(255, 0, 85, 0.4);">
             ⚔️ LEER CAPÍTULO AHORA
          </a>
        </div>
      </div>
    `;
    await procesarEnvioMasivo(`💥 ¡NUEVO CAPÍTULO! Lea el ${nombreCap} de Thalesis ahora`, html);
  }

  for (const aviso of nuevosAvisos) {
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b0c10; color: #ffffff; padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto; border: 2px solid #1f2833; border-radius: 12px;">
        <h1 style="color: #66fcf1; font-size: 2.5rem; letter-spacing: 2px; margin-bottom: 5px; text-transform: uppercase; font-weight: 900;">THALESIS</h1>
        <p style="color: #45a29e; font-size: 1rem; margin-top: 0; font-style: italic; letter-spacing: 1px;">Por Raylin AC</p>
        <hr style="border: 0; border-top: 1px solid #1f2833; margin: 30px 0;">
        <h2 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin-bottom: 15px;">¡Hola lector! Hay novedades</h2>
        <p style="color: #c5c6c7; font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">Acabo de subir un nuevo comunicado oficial a la sección de Avisos.</p>
        <div style="margin: 40px 0;"><a href="https://railinc035-gif.github.io/Mizuvichi/" style="background-color: #66fcf1; color: #0b0c10; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1.2rem; display: inline-block;">📢 VER AVISO EN LA WEB</a></div>
      </div>
    `;
    await procesarEnvioMasivo(`📢 AVISO IMPORTANTE: Actualización del autor`, html);
  }

  await metaRef.set({ capitulos: folders, avisos: avisos, ultimaActualizacion: Date.now() });
  process.exit(0);
}

notify().catch(err => { console.error(err); process.exit(1); });
