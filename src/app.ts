import dotenv from 'dotenv';
// Cargar variables de entorno desde .env
dotenv.config();

import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot';
import { MemoryDB } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { generateGroqResponse } from '../base-ts-baileys-memory/src/services/groq';
import { TextToSpeechClient, protos as ttsProtos } from '@google-cloud/text-to-speech'; // Importar 'protos'
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { typing } from "../base-ts-baileys-memory/src/utils/presence";
import { transcribeWithWhisper } from '../base-ts-baileys-memory/src/services/whisper'; // Asegúrate de que esta ruta sea correcta
import { sendTextAndImage } from "../base-ts-baileys-memory/src/utils/imageTextService"; // Importar la nueva función correctamente

// Inicializar cliente de Text-to-Speech
const ttsClient = new TextToSpeechClient();

// Verificar que las variables de entorno estén bien definidas
if (!process.env.GROQ_API_KEY) {
    throw new Error('La variable de entorno GROQ_API_KEY no está definida.');
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('La variable de entorno GOOGLE_APPLICATION_CREDENTIALS no está definida.');
}

const PORT = parseInt(process.env.PORT || '3008', 10); // Puerto de la aplicación

/** Crear el directorio de audios si no existe */
function ensureAudiosDirectory() {
    const audiosDir = './audios/';
    const receivedDir = `${audiosDir}received/`;
    const sentDir = `${audiosDir}sent/`;

    if (!fs.existsSync(audiosDir)) {
        fs.mkdirSync(audiosDir, { recursive: true });
        console.log(`Directorio '${audiosDir}' creado.`);
    }

    if (!fs.existsSync(receivedDir)) {
        fs.mkdirSync(receivedDir, { recursive: true });
        console.log(`Directorio '${receivedDir}' creado.`);
    }

    if (!fs.existsSync(sentDir)) {
        fs.mkdirSync(sentDir, { recursive: true });
        console.log(`Directorio '${sentDir}' creado.`);
    }
}

// Asegurar que los directorios para audios existan
ensureAudiosDirectory();

/**
 * Función para convertir texto a voz utilizando Google Cloud Text-to-Speech.
 * @param {string} text - Texto que se convertirá a audio.
 * @returns {Promise<string>} - La ruta del archivo de audio generado.
 */
async function synthesizeSpeech(text: string): Promise<string> {
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'es-ES', ssmlGender: ttsProtos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE },
            audioConfig: { audioEncoding: ttsProtos.google.cloud.texttospeech.v1.AudioEncoding.MP3 },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioContent = response.audioContent;

        if (audioContent) {
            const audioFilePath = `./audios/sent/response-${uuidv4()}.mp3`;
            await fs.promises.writeFile(audioFilePath, audioContent, 'binary');
            console.log(`Audio sintetizado guardado en: ${audioFilePath}`);
            return audioFilePath;
        } else {
            throw new Error('No se pudo obtener contenido de audio.');
        }
    } catch (error) {
        console.error(`Error en synthesizeSpeech: ${error}`);
        throw error;
    }
}

/** Mecanismos de colas y bloqueo para gestionar múltiples usuarios */
const userQueues = new Map();
const userLocks = new Map();

const welcomeText = '¡Bienvenido! Estoy aquí para ayudarte. Por favor, no dudes en escribir tu inquietud.';
const welcomeImageUrl = 'https://saludprimavera.com.pe/wp-content/uploads/2022/02/odontologia.jpg';

/**
 * Función para procesar el mensaje del usuario.
 * @param {Object} ctx - El contexto del mensaje.
 */
const processUserMessage = async (ctx: any, { flowDynamic, state, provider }: { flowDynamic: any, state: any, provider: any }) => {
    try {
        await typing(ctx, provider); // Indicador de "escribiendo"

        const userMessage = ctx.body;

        if (userMessage) {
            // Generar la respuesta en texto usando Groq
            const responseText = await generateGroqResponse(userMessage);

            // Enviar la respuesta en texto
            await flowDynamic([{ text: responseText }]);

            // Generar la respuesta en formato de audio
            const sentAudioPath = await synthesizeSpeech(responseText);

            // Enviar la respuesta en formato de audio
            await flowDynamic([{ media: sentAudioPath }]);
        }
    } catch (error) {
        await flowDynamic([{ text: 'Ocurrió un error procesando tu mensaje.' }]);
    }
};

/**
 * Función para manejar la cola de mensajes por usuario.
 * @param {string} userId - El ID del usuario.
 */
const handleQueue = async (userId: string) => {
    const queue = userQueues.get(userId);

    if (userLocks.get(userId)) {
        return;
    }

    while (queue && queue.length > 0) {
        userLocks.set(userId, true);
        const { ctx, flowDynamic, state, provider } = queue.shift();
        try {
            await processUserMessage(ctx, { flowDynamic, state, provider });
        } finally {
            userLocks.set(userId, false);
        }
    }

    userLocks.delete(userId);
    userQueues.delete(userId);
};

const generalFlow = addKeyword(['.*']).addAction(async (ctx: any, { flowDynamic, state, provider }: { flowDynamic: any, state: any, provider: any }) => {
    const userId = ctx.from;

    if (!userQueues.has(userId)) {
        userQueues.set(userId, []);
    }

    const queue = userQueues.get(userId);
    queue.push({ ctx, flowDynamic, state, provider });

    if (!userLocks.get(userId) && queue.length === 1) {
        await handleQueue(userId);
    }
});

const main = async () => {
    try {
        const adapterFlow = createFlow([generalFlow]);
        const adapterProvider = createProvider(BaileysProvider, { groupsIgnore: true, readStatus: false });
        const adapterDB = new MemoryDB();
        const { httpServer } = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        });

        httpServer(PORT);
        console.log(`Servidor escuchando en http://localhost:${PORT}`);
    } catch (error) {
        process.exit(1);
    }
};

// Ejecutar el bot
main().catch((error) => {
    process.exit(1);
});
