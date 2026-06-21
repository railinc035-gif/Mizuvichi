const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://webmanga-7b2cb-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function notify() {
  console.log("Iniciando escaneo de contenido...");

  // 1. Obtener carpetas actuales
  const repoPath = './';
  const folders = fs.readdirSync(repoPath).filter(f => 
    fs.statSync(path.join(repoPath, f)).isDirectory() && f.startsWith('Cap_')
  );

  // 2. Obtener lista de Avisos
  const avisoPath = './Aviso';
  let avisos = [];
  if (fs.existsSync(avisoPath)) {
    avisos = fs.readdirSync(avisoPath).filter(f => f.toLowerCase().endsWith('.png'));
  }

  // 3. Obtener metadatos de Firebase
  const metaRef = db.ref('metadatos_envios');
  const snapshot = await metaRef.once('value');
  const metadata = snapshot.val() || { capitulos: [], avisos: [] };

  const nuevosCaps = folders.filter(f => !metadata.capitulos.includes(f));
  const nuevosAvisos = avisos.filter(a => !metadata.avisos.includes(a));

  if (nuevosCaps.length === 0 && nuevosAvisos.length === 0) {
    console.log("No hay contenido nuevo para notificar.");
    process.exit(0);
  }

  // 4. Obtener suscriptores
  const subsSnapshot = await db.ref('subscriptores').once('value');
  const subscribers = subsSnapshot.val();
  if (!subscribers) {
    console.log("No hay suscriptores registrados.");
    process.exit(0);
  }

  const emailList = Object.values(subscribers).map(s => ({ email: s.email }));

  // 5. Configuración de Brevo
  const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.EMAIL_FROM;

  // 6. Enviar notificaciones
  for (const cap of nuevosCaps) {
    const nombreCap = cap.replace('Cap_', 'Capítulo ');
    console.log(`Enviando correos por ${nombreCap}...`);
    
    try {
      await axios.post(BREVO_API_URL, {
        sender: { name: "Mizuvichi", email: SENDER_EMAIL },
        to: emailList,
        subject: `📖 ¡Nuevo Capítulo: ${nombreCap}!`,
        htmlContent: `
          <div style="font-family: sans-serif; background: #050505; color: white; padding: 20px; border-radius: 10px;">
            <h2 style="color: #ff0000;">¡Hola lector!</h2>
            <p>Se ha publicado el <strong>${nombreCap}</strong> en Thalesis.</p>
            <a href="https://railinc035-gif.github.io/Mizuvichi/#capitulo=${cap}" 
               style="background: #ff0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Leer ahora
            </a>
            <br><br>
            <p style="font-size: 0.8rem; color: #888;">Puedes desuscribirte en la web si ya no quieres recibir estos avisos.</p>
          </div>
        `
      }, {
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error(`Error enviando capítulo: ${e.response ? e.response.data.message : e.message}`);
    }
  }

  for (const aviso of nuevosAvisos) {
    console.log("Enviando correos por nuevo aviso...");
    try {
      await axios.post(BREVO_API_URL, {
        sender: { name: "Mizuvichi", email: SENDER_EMAIL },
        to: emailList,
        subject: `📢 ¡Nuevo Aviso Informativo!`,
        htmlContent: `
          <div style="font-family: sans-serif; background: #050505; color: white; padding: 20px; border-radius: 10px;">
            <h2 style="color: #00ff66;">¡Hola lector!</h2>
            <p>Hay un nuevo aviso importante en Thalesis que no te puedes perder.</p>
            <a href="https://railinc035-gif.github.io/Mizuvichi/" 
               style="background: #00ff66; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Ver Aviso
            </a>
            <br><br>
            <p style="font-size: 0.8rem; color: #888;">Puedes desuscribirte en la web si ya no quieres recibir estos avisos.</p>
          </div>
        `
      }, {
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error(`Error enviando aviso: ${e.response ? e.response.data.message : e.message}`);
    }
  }

  // 7. Guardar metadatos
  await metaRef.set({ capitulos: folders, avisos: avisos, ultimaActualizacion: Date.now() });

  console.log("¡Todo listo!");
  process.exit(0);
}

notify().catch(err => { console.error(err); process.exit(1); });
