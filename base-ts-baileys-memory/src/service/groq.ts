import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Groq from 'groq-sdk'; // Importar el SDK de Groq

// Cargar variables de entorno
dotenv.config();

// Verifica que las variables de entorno necesarias estén definidas
if (!process.env.GROQ_API_KEY) {
    throw new Error('La variable de entorno GROQ_API_KEY no está definida.');
}

// Inicializar el cliente de Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Lee el contenido del archivo instrucciones.txt.
 * @returns El contenido de instrucciones.txt como una cadena de texto.
 */
function loadInstructionsContext(): string {
    try {
        const filePath = path.join(process.cwd(), 'documentos', 'instrucciones.txt'); // Cambiado a path.join
        const data = fs.readFileSync(filePath, 'utf-8');
        return data;
    } catch (error) {
        console.error('Error al leer instrucciones.txt:', error);
        throw new Error('No se pudo cargar el contexto de instrucciones.');
    }
}

// Cargar el contexto adicional desde instrucciones.txt
const instructionsContext = loadInstructionsContext();

/**
 * Genera una respuesta utilizando el modelo de Groq.
 * @param {string} userMessage - El mensaje del usuario al que se responde.
 * @returns {Promise<string>} - La respuesta generada por Groq.
 */
export async function generateGroqResponse(userMessage: string): Promise<string> {
    // Definir el contexto y las instrucciones para el asistente
    const systemPrompt = `Actúa como glory, la asistente y asesora de atención al cliente de la empresa de productos de nutricion "FUXION", y resuelve dudas e inquietudes de los clientes.

Contexto adicional:
${instructionsContext}
`;

    try {
        // Realiza la solicitud al SDK de Groq
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userMessage,
                },
            ],
            model: "llama3-8b-8192", // Usa el modelo correcto
        });

        // Acceder a la respuesta del modelo
        const message = response.choices[0]?.message?.content?.trim() || "No se pudo generar una respuesta.";
        return message;
    } catch (error) {
        // Aquí hacemos un "casting" del error a `any` o usamos `instanceof` para verificar si es un `Error`.
        if (error instanceof Error) {
            console.error('Error al generar respuesta con Groq:', (error as any).response?.data || error.message);
        } else {
            console.error('Error desconocido:', error);
        }
        throw new Error('No se pudo generar una respuesta en este momento.');
    }
}
