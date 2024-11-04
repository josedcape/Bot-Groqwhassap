/**
 * Simular la presencia de "escribiendo" mientras se procesa un mensaje.
 * @param {any} ctx - Contexto del mensaje.
 * @param {any} provider - Proveedor de servicios de mensajería.
 */
export const typing = async (ctx: any, provider: any) => {
    await provider.sendPresenceUpdate('composing', ctx.from);
};
