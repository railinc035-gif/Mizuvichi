const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ======================================================
// CONFIGURACIÓN GENERAL
// ======================================================

const CONFIG = {
  BRAND_NAME: "MIZUVICHI",
  BRAND_SUBTITLE: "Manga independiente",
  AUTHOR_NAME: "Raylin AC",

  WEBSITE_URL: "https://railinc035-gif.github.io/Mizuvichi/",
  REPOSITORY_PATH: "./",

  CHAPTER_PREFIX: "Cap_",
  NOTICE_FOLDER: "./Aviso",

  BATCH_SIZE: 50,

  COLORS: {
    background: "#050505",
    panel: "#0d0d0d",
    red: "#ff0000",
    darkRed: "#300000",
    green: "#00ff66",
    white: "#ffffff",
    gray: "#a0a0a0"
  }
};


// ======================================================
// FIREBASE
// ======================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw new Error(
    "Falta la variable FIREBASE_SERVICE_ACCOUNT_JSON."
  );
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://webmanga-7b2cb-default-rtdb.firebaseio.com"
});

const db = admin.database();


// ======================================================
// BREVO
// ======================================================

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

const BREVO_API_KEY =
  process.env.BREVO_API_KEY;

const SENDER_EMAIL =
  process.env.EMAIL_FROM;

if (!BREVO_API_KEY) {
  throw new Error(
    "Falta la variable BREVO_API_KEY."
  );
}

if (!SENDER_EMAIL) {
  throw new Error(
    "Falta la variable EMAIL_FROM."
  );
}


// ======================================================
// FUNCIONES GENERALES
// ======================================================

function obtenerCarpetasCapitulos() {

  return fs
    .readdirSync(CONFIG.REPOSITORY_PATH)

    .filter(nombre => {

      const ruta = path.join(
        CONFIG.REPOSITORY_PATH,
        nombre
      );

      return (
        fs.statSync(ruta).isDirectory() &&
        nombre.startsWith(
          CONFIG.CHAPTER_PREFIX
        )
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

  if (
    !fs.existsSync(
      CONFIG.NOTICE_FOLDER
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      CONFIG.NOTICE_FOLDER
    )

    .filter(nombre => {

      const extension =
        path.extname(nombre)
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


function formatearCapitulo(nombre) {

  return nombre.replace(
    CONFIG.CHAPTER_PREFIX,
    "Capítulo "
  );

}


function escaparHtml(texto) {

  return String(texto)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


function dividirEnGrupos(
  lista,
  cantidad
) {

  const grupos = [];

  for (
    let i = 0;
    i < lista.length;
    i += cantidad
  ) {

    grupos.push(
      lista.slice(
        i,
        i + cantidad
      )
    );

  }

  return grupos;

}


// ======================================================
// PLANTILLA GENERAL DEL CORREO
// ======================================================

function crearPlantilla({
  etiqueta,
  titulo,
  mensaje,
  botonTexto,
  botonUrl,
  color
}) {

  return `
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>
${CONFIG.BRAND_NAME}
</title>

</head>

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
border="0"
style="
background:#050505;
padding:
35px
15px;
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
border="0"
style="
max-width:620px;
background:#0d0d0d;
border:
1px
solid
#222;
border-radius:
16px;
overflow:hidden;
"
>


<!-- CABECERA -->

<tr>

<td
align="center"
style="
padding:
38px
25px
28px;
background:
linear-gradient(
135deg,
#100000,
#050505
);
border-bottom:
2px
solid
${color};
"
>

<div
style="
font-size:12px;
letter-spacing:4px;
color:${color};
font-weight:bold;
margin-bottom:12px;
"
>

MIZUVICHI

</div>

<h1
style="
margin:0;
color:#ffffff;
font-size:34px;
letter-spacing:2px;
"
>

${CONFIG.BRAND_NAME}

</h1>

<p
style="
margin:
10px
0
0;
color:#888;
font-size:14px;
"
>

${CONFIG.BRAND_SUBTITLE}

</p>

</td>

</tr>


<!-- CONTENIDO -->

<tr>

<td
style="
padding:
38px
30px;
text-align:center;
"
>

<div
style="
display:inline-block;
padding:
7px
15px;
border:
1px
solid
${color};
border-radius:
20px;
color:${color};
font-size:12px;
font-weight:bold;
letter-spacing:1px;
margin-bottom:20px;
"
>

${etiqueta}

</div>

<h2
style="
margin:
0
0
18px;
color:#ffffff;
font-size:25px;
line-height:1.3;
"
>

${titulo}

</h2>

<p
style="
margin:
0
auto;
max-width:500px;
color:#aaa;
font-size:16px;
line-height:1.7;
"
>

${mensaje}

</p>


<!-- BOTÓN -->

<table
align="center"
cellpadding="0"
cellspacing="0"
border="0"
style="
margin-top:32px;
"
>

<tr>

<td
align="center"
style="
background:${color};
border-radius:8px;
"
>

<a
href="${botonUrl}"

style="
display:inline-block;
padding:
16px
30px;
color:#000000;
font-size:15px;
font-weight:bold;
text-decoration:none;
"
>

${botonTexto}

</a>

</td>

</tr>

</table>

</td>

</tr>


<!-- PIE -->

<tr>

<td
style="
padding:
25px;
background:#080808;
border-top:
1px
solid
#222;
text-align:center;
"
>

<p
style="
margin:
0
0
10px;
color:#777;
font-size:12px;
line-height:1.6;
"
>

Recibes este correo porque te suscribiste
a las novedades de
<strong
style="
color:#ffffff;
"
>

${CONFIG.BRAND_NAME}

</strong>.

</p>

<p
style="
margin:0;
color:#444;
font-size:11px;
"
>

© ${new Date().getFullYear()}
${CONFIG.BRAND_NAME}
· Creado por
${CONFIG.AUTHOR_NAME}

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


// ======================================================
// ENVÍO POR GRUPOS
// ======================================================

async function enviarCorreo(
  destinatarios,
  asunto,
  html,
  texto
) {

  const grupos =
    dividirEnGrupos(
      destinatarios,
      CONFIG.BATCH_SIZE
    );

  let enviados = 0;

  for (
    const grupo
    of grupos
  ) {

    await axios.post(

      BREVO_API_URL,

      {

        sender: {

          name:
            CONFIG.BRAND_NAME,

          email:
            SENDER_EMAIL

        },

        /*
        Se usa BCC para que los
        suscriptores no vean
        los correos de los demás.
        */

        to: [
          {
            email:
              SENDER_EMAIL,

            name:
              CONFIG.BRAND_NAME
          }
        ],

        bcc:
          grupo.map(
            email => ({
              email
            })
          ),

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

    enviados +=
      grupo.length;

    console.log(
      `✓ Grupo enviado: ` +
      `${enviados}/` +
      `${destinatarios.length}`
    );

  }

}


// ======================================================
// PROCESO PRINCIPAL
// ======================================================

async function notify() {

  console.log(
    "\n================================"
  );

  console.log(
    " MIZUVICHI · NOTIFICADOR"
  );

  console.log(
    "================================\n"
  );


  // CONTENIDO

  const carpetas =
    obtenerCarpetasCapitulos();

  const avisos =
    obtenerAvisos();


  // METADATOS

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


  const capitulosEnviados =
    Array.isArray(
      metadata.capitulos
    )
      ? metadata.capitulos
      : [];


  const avisosEnviados =
    Array.isArray(
      metadata.avisos
    )
      ? metadata.avisos
      : [];


  const nuevosCaps =
    carpetas.filter(

      cap =>
        !capitulosEnviados
          .includes(cap)

    );


  const nuevosAvisos =
    avisos.filter(

      aviso =>
        !avisosEnviados
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
      "\nNo hay contenido nuevo."
    );

    return;

  }


  // SUSCRIPTORES

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


  if (!subscribers) {

    console.log(
      "\nNo hay suscriptores."
    );

    return;

  }


  const emails =
    [
      ...new Set(

        Object
          .values(
            subscribers
          )

          .map(
            usuario =>
              usuario?.email
                ?.trim()
                ?.toLowerCase()
          )

          .filter(
            email =>

              email &&

              /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(email)
          )

      )
    ];


  console.log(
    `Suscriptores válidos: ` +
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


  // RESULTADOS

  const capitulosCorrectos = [];

  const avisosCorrectos = [];


  // ====================================================
  // CAPÍTULOS
  // ====================================================

  for (
    const cap
    of nuevosCaps
  ) {

    const nombreCap =
      formatearCapitulo(
        cap
      );


    console.log(
      `\nEnviando: ` +
      nombreCap
    );


    const enlace =
      `${CONFIG.WEBSITE_URL}` +
      `#capitulo=${encodeURIComponent(cap)}`;


    const html =
      crearPlantilla({

        etiqueta:
          "NUEVO CAPÍTULO",

        titulo:
          `¡${nombreCap} ya está disponible!`,

        mensaje:

          `
La historia continúa.
El nuevo capítulo ya fue publicado
en <strong
style="
color:#ffffff;
"
>

${CONFIG.BRAND_NAME}

</strong>.

<br><br>

Entra ahora y descubre
qué ocurre después.
          `,

        botonTexto:
          "📖 LEER AHORA",

        botonUrl:
          enlace,

        color:
          CONFIG.COLORS.red

      });


    const texto =

`${CONFIG.BRAND_NAME}

${nombreCap}
ya está disponible.

Lee el capítulo:

${enlace}

Gracias por apoyar
el manga independiente.
`;


    try {

      await enviarCorreo(

        emails,

        `📖 Nuevo capítulo · ${nombreCap}`,

        html,

        texto

      );


      capitulosCorrectos.push(
        cap
      );


      console.log(
        `✓ ${nombreCap} enviado correctamente.`
      );


    } catch (error) {

      console.error(

        `✗ Error en ${nombreCap}:`,

        error.response?.data ||
        error.message

      );

    }

  }


  // ====================================================
  // AVISOS
  // ====================================================

  for (
    const aviso
    of nuevosAvisos
  ) {

    console.log(
      "\nEnviando aviso..."
    );


    const html =
      crearPlantilla({

        etiqueta:
          "COMUNICADO",

        titulo:
          "Hay una nueva actualización",

        mensaje:

`
Se publicó un nuevo aviso
en la página oficial de
<strong
style="
color:#ffffff;
"
>

${CONFIG.BRAND_NAME}

</strong>.

<br><br>

Pasa por la web para conocer
las novedades del proyecto.
`,

        botonTexto:
          "📢 VER AVISO",

        botonUrl:
          CONFIG.WEBSITE_URL,

        color:
          CONFIG.COLORS.green

      });


    const texto =

`${CONFIG.BRAND_NAME}

Hay un nuevo comunicado.

Visita la web:

${CONFIG.WEBSITE_URL}
`;


    try {

      await enviarCorreo(

        emails,

        `📢 Nuevo aviso · ${CONFIG.BRAND_NAME}`,

        html,

        texto

      );


      avisosCorrectos.push(
        aviso
      );


      console.log(
        "✓ Aviso enviado."
      );


    } catch (error) {

      console.error(

        "✗ Error enviando aviso:",

        error.response?.data ||
        error.message

      );

    }

  }


  // ====================================================
  // GUARDAR SOLO LO QUE SÍ SE ENVIÓ
  // ====================================================

  const capitulosFinales =
    [
      ...new Set([
        ...capitulosEnviados,
        ...capitulosCorrectos
      ])
    ];


  const avisosFinales =
    [
      ...new Set([
        ...avisosEnviados,
        ...avisosCorrectos
      ])
    ];


  await metaRef.set({

    capitulos:
      capitulosFinales,

    avisos:
      avisosFinales,

    ultimaActualizacion:
      Date.now()

  });


  console.log(
    "\n================================"
  );

  console.log(
    " PROCESO TERMINADO"
  );

  console.log(
    "================================\n"
  );

}


notify()

.catch(error => {

  console.error(

    "\nERROR GENERAL:",

    error

  );

  process.exitCode = 1;

});
