// services/whisper.ts

import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    throw new Error('La variable de entorno OPENAI_API_KEY no está definida.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe un archivo de audio utilizando OpenAI Whisper.
 * @param {string} audioPath - Ruta del archivo de audio.
 * @returns {Promise<string>} - Transcripción del audio.
 */
export async function transcribeWithWhisper(audioPath: string): Promise<string> {
    try {
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: 'whisper-1', // Asegúrate de usar el modelo correcto
            language: 'es', // Establece el idioma según corresponda
        });

        const transcription = response.text;
        console.log(`Transcripción obtenida con Whisper: ${transcription}`);
        return transcription;
    } catch (error: any) {
        console.error('Error en transcribeWithWhisper:', error.response ? error.response.data : error.message);
        throw new Error('No se pudo transcribir el audio con Whisper.');
    }
}
