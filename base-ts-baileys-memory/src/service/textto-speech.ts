const fs = require("fs");
const path = require("path"); // Importar el módulo 'path'
const { TextToSpeechClient, protos } = require("@google-cloud/text-to-speech");
const dotenv = require("dotenv");
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

/**
 * Verifica que las variables de entorno estén definidas.
 */
const requiredEnvVars = ['GROQ_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'];
requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        throw new Error(`La variable de entorno ${envVar} no está definida.`);
    }
});

/**
 * Crear una instancia del cliente de Text-to-Speech de Google Cloud
 */
const ttsClient = new TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
 * Convierte texto a audio utilizando la API de Google Cloud Text-to-Speech.
 * @param text - El texto que se desea convertir a audio.
 * @returns La ruta al archivo de audio generado.
 */
async function generateAudio(text) {
    const request = {
        input: { text },
        voice: { languageCode: 'es-ES', ssmlGender: protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL },
        audioConfig: { audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3 },
    };

    try {
        const [response] = await ttsClient.synthesizeSpeech(request);

        if (!response.audioContent) {
            throw new Error('No se recibió contenido de audio de la API.');
        }

        const audioDirectory = path.join(process.cwd(), 'audios');

        // Crear el directorio si no existe
        await fs.promises.mkdir(audioDirectory, { recursive: true });

        // Generar un nombre único para el archivo de audio
        const fileName = `respuesta-${Date.now()}.mp3`;
        const filePath = path.join(audioDirectory, fileName);

        // Escribir el archivo de audio en el sistema de archivos
        await fs.promises.writeFile(filePath, response.audioContent, 'binary');

        console.log(`Audio generado y guardado en: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('Error al generar audio con Google Cloud TTS:', error);
        throw new Error('No se pudo generar el audio.');
    }
}

/**
 * Genera una respuesta de texto utilizando la API de Groq.
 * @param prompt - El texto de entrada para generar una respuesta.
 * @returns La respuesta generada por Groq.
 */
async function generateResponse(prompt) {
    try {
        // Realizar la solicitud a la API de Groq
        const response = await axios.post(
            'https://api.groq.com/v1/generate', // URL de la API de Groq
            {
                prompt, // El mensaje del usuario se pasa como el 'prompt'
                max_tokens: 150,
                temperature: 0.5,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // Usar la clave API de Groq
                },
            }
        );

        // Verificar que la estructura de la respuesta sea válida
        if (!response || !response.data || !response.data.responseText) {
            throw new Error('La respuesta de Groq no contiene opciones válidas.');
        }

        // Acceder a la respuesta generada
        const message = response.data.responseText.trim();

        // Verificar que se haya generado una respuesta válida
        if (!message) {
            throw new Error('La respuesta de Groq está vacía o no es válida.');
        }

        return message;
    } catch (error) {
        // Manejo detallado del error para identificar problemas
        const errorMessage = error.response?.data?.error?.message || error.message || 'Error desconocido';
        console.error('Error al generar respuesta con Groq:', errorMessage);
        throw new Error(`No se pudo generar una respuesta en este momento. Detalle del error: ${errorMessage}`);
    }
}

// Exportar las funciones para que puedan ser usadas en otros archivos
module.exports = {
    generateAudio,
    generateResponse
};
