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
// CONFIGURACIÓN
// =====================================================

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

const BREVO_API_KEY =
  process.env.BREVO_API_KEY;

const SENDER_EMAIL =
  process.env.EMAIL_FROM;

const WEBSITE_URL =
  "https://railinc035-gif.github.io/Mizuvichi/";

// Pausa entre correos.
// Ayuda a evitar demasiadas solicitudes seguidas.
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

      const ruta =
        path.join(
          "./",
          nombre
        );

      return (
        fs.statSync(ruta).isDirectory() &&
        nombre.startsWith("Cap_")
      );

    })

    .sort((a, b) => {

      return a.localeCompare(
        b,
        undefined,
        {
          numeric: true
        }
      );

    });

}


function obtenerAvisos() {

  const rutaAvisos =
    "./Aviso";

  if (
    !fs.existsSync(
      rutaAvisos
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      rutaAvisos
    )

    .filter(nombre => {

      const extension =
        path
          .extname(nombre)
          .toLowerCase();

      return [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp"
      ].includes(extension);

    })

    .sort((a, b) => {

      return a.localeCompare(
        b,
        undefined,
        {
          numeric: true
        }
      );

    });

}


function obtenerCorreos(
  subscribers
) {

  const correos =

    Object
      .values(
        subscribers || {}
      )

      .map(usuario => {

        return usuario?.email
          ?.trim()
          ?.toLowerCase();

      })

      .filter(email => {

        if (!email) {
          return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(email);

      });


  return [
    ...new Set(correos)
  ];

}


// =====================================================
// DISEÑO DEL CORREO
// =====================================================

function crearCorreoCapitulo(
  nombreCapitulo,
  enlace
) {

  return `
<!DOCTYPE html>

<html lang="es">

<body
style="
margin:0;
padding:0;
background:#050505;
font-family:
Arial,
Helvetica,
sans-serif;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#050505;
padding:35px 15px;
"
>

<tr>

<td
align="center"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:600px;
background:#0d0d0d;
border:1px solid #2a0000;
border-radius:15px;
overflow:hidden;
"
>


<!-- CABECERA -->

<tr>

<td
align="center"
style="
padding:35px 20px;
background:
linear-gradient(
135deg,
#1a0000,
#050505
);
border-bottom:
2px solid #ff0000;
"
>

<div
style="
color:#ff0000;
font-size:12px;
font-weight:bold;
letter-spacing:5px;
margin-bottom:12px;
"
>

NUEVO LANZAMIENTO

</div>

<h1
style="
margin:0;
color:#ffffff;
font-size:34px;
letter-spacing:3px;
"
>

MIZUVICHI

</h1>

<p
style="
margin:10px 0 0;
color:#777;
font-size:13px;
"
>

Manga independiente

</p>

</td>

</tr>


<!-- CONTENIDO -->

<tr>

<td
align="center"
style="
padding:40px 28px;
"
>

<h2
style="
margin:0 0 18px;
color:#ffffff;
font-size:25px;
"
>

¡${nombreCapitulo}
ya está disponible!

</h2>

<p
style="
margin:0;
color:#a8a8a8;
font-size:16px;
line-height:1.7;
"
>

La historia continúa.

<br><br>

El nuevo capítulo ya fue publicado
en la plataforma oficial de
<strong
style="
color:#ffffff;
"
>

MIZUVICHI

</strong>.

</p>


<table
cellpadding="0"
cellspacing="0"
style="
margin-top:32px;
"
>

<tr>

<td
align="center"
style="
background:#ff0000;
border-radius:7px;
"
>

<a
href="${enlace}"
style="
display:inline-block;
padding:16px 32px;
color:#ffffff;
font-size:15px;
font-weight:bold;
text-decoration:none;
"
>

📖 LEER CAPÍTULO

</a>

</td>

</tr>

</table>

</td>

</tr>


<!-- PIE -->

<tr>

<td
align="center"
style="
padding:25px;
background:#080808;
border-top:
1px solid #222;
"
>

<p
style="
margin:0 0 10px;
color:#666;
font-size:12px;
line-height:1.6;
"
>

Recibes este correo porque
te suscribiste a las novedades
de MIZUVICHI.

</p>

<p
style="
margin:0;
color:#444;
font-size:11px;
"
>

© ${new Date().getFullYear()}
MIZUVICHI

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

<body
style="
margin:0;
padding:0;
background:#050505;
font-family:
Arial,
Helvetica,
sans-serif;
"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#050505;
padding:35px 15px;
"
>

<tr>

<td
align="center"
>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:600px;
background:#0d0d0d;
border:1px solid #003d19;
border-radius:15px;
overflow:hidden;
"
>


<!-- CABECERA -->

<tr>

<td
align="center"
style="
padding:35px 20px;
background:
linear-gradient(
135deg,
#001a0b,
#050505
);
border-bottom:
2px solid #00ff66;
"
>

<div
style="
color:#00ff66;
font-size:12px;
font-weight:bold;
letter-spacing:5px;
margin-bottom:12px;
"
>

COMUNICADO OFICIAL

</div>

<h1
style="
margin:0;
color:#ffffff;
font-size:34px;
letter-spacing:3px;
"
>

MIZUVICHI

</h1>

</td>

</tr>


<!-- CONTENIDO -->

<tr>

<td
align="center"
style="
padding:40px 28px;
"
>

<h2
style="
margin:0 0 18px;
color:#ffffff;
font-size:25px;
"
>

Hay una nueva actualización

</h2>

<p
style="
margin:0;
color:#a8a8a8;
font-size:16px;
line-height:1.7;
"
>

Se publicó un nuevo aviso
en la plataforma oficial.

<br><br>

Entra para conocer las novedades
del proyecto.

</p>


<table
cellpadding="0"
cellspacing="0"
style="
margin-top:32px;
"
>

<tr>

<td
align="center"
style="
background:#00ff66;
border-radius:7px;
"
>

<a
href="${WEBSITE_URL}"
style="
display:inline-block;
padding:16px 32px;
color:#000000;
font-size:15px;
font-weight:bold;
text-decoration:none;
"
>

📢 VER AVISO

</a>

</td>

</tr>

</table>

</td>

</tr>


<!-- PIE -->

<tr>

<td
align="center"
style="
padding:25px;
background:#080808;
border-top:
1px solid #222;
"
>

<p
style="
margin:0;
color:#666;
font-size:12px;
"
>

Gracias por seguir MIZUVICHI.

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
// ENVIAR UN CORREO
// =====================================================

async function enviarUnoPorUno({
  email,
  asunto,
  html,
  texto
}) {

  await axios.post(

    BREVO_API_URL,

    {

      sender: {

        name:
          "MIZUVICHI",

        email:
          SENDER_EMAIL

      },

      to: [

        {

          email:
            email

        }

      ],

      subject:
        asunto,

      htmlContent:
        html,

      textContent:
        texto

    },

    {

      headers: {

        "api-key":
          BREVO_API_KEY,

        "Content-Type":
          "application/json"

      },

      timeout:
        30000

    }

  );

}


// =====================================================
// ENVIAR A TODOS, UNO POR UNO
// =====================================================

async function enviarATodos(
  emails,
  asunto,
  html,
  texto
) {

  let enviados = 0;

  let fallidos = 0;


  for (
    const email
    of emails
  ) {

    try {

      console.log(
        `Enviando a: ${email}`
      );


      await enviarUnoPorUno({

        email,

        asunto,

        html,

        texto

      });


      enviados++;

      console.log(
        `✓ Enviado correctamente`
      );


    } catch (error) {

      fallidos++;

      console.error(

        `✗ Error con ${email}:`,

        error.response?.data ||
        error.message

      );

    }


    await esperar(
      DELAY_BETWEEN_EMAILS
    );

  }


  console.log(
    `\nResultado: ` +
    `${enviados} enviados, ` +
    `${fallidos} fallidos.`
  );


  return {

    enviados,

    fallidos

  };

}


// =====================================================
// PROCESO PRINCIPAL
// =====================================================

async function notify() {

  console.log(
    "\n===== MIZUVICHI =====\n"
  );


  const capitulos =
    obtenerCapitulos();


  const avisos =
    obtenerAvisos();


  const metaRef =
    db.ref(
      "metadatos_envios"
    );


  const snapshot =
    await metaRef.once(
      "value"
    );


  const metadata =
    snapshot.val() || {

      capitulos: [],

      avisos: []

    };


  const capitulosAnteriores =
    Array.isArray(
      metadata.capitulos
    )
      ? metadata.capitulos
      : [];


  const avisosAnteriores =
    Array.isArray(
      metadata.avisos
    )
      ? metadata.avisos
      : [];


  const nuevosCaps =

    capitulos.filter(

      cap =>

        !capitulosAnteriores
          .includes(cap)

    );


  const nuevosAvisos =

    avisos.filter(

      aviso =>

        !avisosAnteriores
          .includes(aviso)

    );


  console.log(
    `Capítulos nuevos: ` +
    nuevosCaps.length
  );


  console.log(
    `Avisos nuevos: ` +
    nuevosAvisos.length
  );


  if (

    nuevosCaps.length === 0 &&

    nuevosAvisos.length === 0

  ) {

    console.log(
      "No hay contenido nuevo."
    );

    return;

  }


  const subsSnapshot =

    await db

      .ref(
        "subscriptores"
      )

      .once(
        "value"
      );


  const subscribers =

    subsSnapshot.val();


  const emails =

    obtenerCorreos(
      subscribers
    );


  console.log(
    `Suscriptores: ` +
    emails.length
  );


  if (
    emails.length === 0
  ) {

    console.log(
      "No hay correos válidos."
    );

    return;

  }


  const capitulosEnviados = [];

  const avisosEnviados = [];


  // CAPÍTULOS

  for (
    const cap
    of nuevosCaps
  ) {

    const nombreCap =

      cap.replace(
        "Cap_",
        "Capítulo "
      );


    const enlace =

      `${WEBSITE_URL}` +
      `#capitulo=` +
      encodeURIComponent(cap);


    const html =

      crearCorreoCapitulo(

        nombreCap,

        enlace

      );


    const resultado =

      await enviarATodos(

        emails,

        `📖 ${nombreCap} ya está disponible`,

        html,

        `${nombreCap} ya está disponible.

Lee el capítulo:

${enlace}`

      );


    // Solo se marca como enviado
    // si todos los correos salieron bien.

    if (
      resultado.fallidos === 0
    ) {

      capitulosEnviados.push(
        cap
      );

    }

  }


  // AVISOS

  for (
    const aviso
    of nuevosAvisos
  ) {

    const html =

      crearCorreoAviso();


    const resultado =

      await enviarATodos(

        emails,

        "📢 Nueva actualización en MIZUVICHI",

        html,

        `Hay un nuevo aviso.

Visita:

${WEBSITE_URL}`

      );


    if (
      resultado.fallidos === 0
    ) {

      avisosEnviados.push(
        aviso
      );

    }

  }


  // GUARDAR ESTADO

  await metaRef.set({

    capitulos: [

      ...capitulosAnteriores,

      ...capitulosEnviados

    ],

    avisos: [

      ...avisosAnteriores,

      ...avisosEnviados

    ],

    ultimaActualizacion:
      Date.now()

  });


  console.log(
    "\nProceso terminado."
  );

}


notify()

.catch(error => {

  console.error(

    "\nERROR GENERAL:",

    error

  );

  process.exit(1);

});
