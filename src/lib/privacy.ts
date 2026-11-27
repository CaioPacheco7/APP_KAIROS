/**
 * "Ocultar valores": preferência guardada no navegador (vale para este
 * aparelho). Fica fora do módulo do botão ("use client") para o layout do
 * servidor poder usar o script como texto.
 */
export const PRIVACY_KEY = "kairos:ocultar-valores";

/** Evento que avisa os botões quando o modo muda. */
export const PRIVACY_EVENT = "kairos:privacy";

/**
 * Roda no <head>, antes da primeira pintura: aplica o modo salvo para os
 * valores nunca aparecerem por um instante.
 */
export const privacyBootScript = `try{if(localStorage.getItem(${JSON.stringify(PRIVACY_KEY)})==="on")document.documentElement.dataset.privacy="on"}catch(e){}`;
