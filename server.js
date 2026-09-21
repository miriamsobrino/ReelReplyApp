
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 3000;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const automatizaciones = require("./automatizaciones");
app.use(express.json());


// Página principal
app.get("/", (req, res) => {
  res.send("ReelReply API funcionando");
});


// Comprobar tokens
console.log(
  "Instagram token cargado:",
  !!process.env.INSTAGRAM_ACCESS_TOKEN
);

console.log(
  "Facebook token cargado:",
  !!process.env.FACEBOOK_ACCESS_TOKEN
);


// Webhook - verificación de Meta
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

function elegirRespuesta(respuestas) {
  return respuestas[
    Math.floor(Math.random() * respuestas.length)
  ];
}
// Responder públicamente al comentario
async function responderComentario(commentId, mensaje) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v26.0/${commentId}/replies`,
      {
        message: mensaje,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN
      }
    );

    console.log("✅ Respuesta pública enviada:", response.data);

  } catch (error) {
    console.log(
      "❌ Error al responder comentario:",
      error.response?.data || error.message
    );
  }
}


// Enviar mensaje privado al usuario que comentó
async function enviarMensajePrivado(commentId, mensaje) {
  try {
    const response = await axios.post(
      `https://graph.instagram.com/v26.0/${INSTAGRAM_USER_ID}/messages`,
      {
        recipient: {
          comment_id: commentId
        },
        message: {
          text: mensaje
        },
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN
      }
    );

    console.log("📩 DM enviado:", response.data);

  } catch (error) {
    console.log(
      "❌ Error al enviar DM:",
      error.response?.data || error.message
    );
  }
}


// Webhook - recibir eventos
app.post("/webhook", async (req, res) => {



  const change = req.body.entry?.[0]?.changes?.[0];

  if (change?.field === "comments") {

    const comentario = change.value.text || "";
    const usuario = change.value.from?.username;
    const commentId = change.value.id;
    const mediaId = change.value.media?.id;

    console.log("Usuario:", usuario);
    console.log("Comentario:", comentario);
    console.log("Comment ID:", commentId);


   const texto = comentario.toLowerCase(); 
   for (const palabra in automatizaciones) { 
    // Comprobar si el comentario contiene la palabra 
    if ( usuario !== "soger__" && texto.includes(palabra) &&
  (
    !automatizaciones[palabra].mediaId ||
    automatizaciones[palabra].mediaId === mediaId
  )) 
        { const automatizacion = automatizaciones[palabra]; 
        
            // 1. Elegir respuesta pública
         const respuestaComentario = elegirRespuesta( automatizacion.respuestasComentario ); 
         // 2. Responder públicamente
         await responderComentario( commentId, respuestaComentario ); 
         // 3. Elegir mensaje privado
         const mensajePrivado = elegirRespuesta( automatizacion.mensajesPrivados ); 
         // 4. Enviar mensaje privado
         await enviarMensajePrivado( commentId, mensajePrivado ); 
         // Evitamos que una misma publicación 
          break; } 
        } 
    } 
    res.sendStatus(200);
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(
    `Servidor funcionando en http://localhost:${PORT}`
  );
});

