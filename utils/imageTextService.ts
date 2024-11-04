const axios = require('axios');

/**
 * Enviar un texto y una imagen al usuario.
 * @param {string} text - Texto a enviar.
 * @param {string} imageUrl - URL de la imagen a enviar.
 * @param {any} flowDynamic - Función para enviar la respuesta al usuario.
 */
const sendTextAndImage = async (text, imageUrl, flowDynamic) => {
    try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary').toString('base64');

        await flowDynamic([{ text }, { image: imageBuffer }]);
    } catch (error) {
        console.error(`Error al enviar imagen y texto: ${error}`);
        throw error;
    }
};

// Exportar la función
module.exports = { sendTextAndImage };
