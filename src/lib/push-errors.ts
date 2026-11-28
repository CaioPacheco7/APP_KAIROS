/**
 * Por que as notificações não ativaram, em português e com o que fazer.
 * Sem navegador aqui: só texto, para dar para testar.
 */

/** Em que etapa da ativação deu errado. */
export type PushStep = "permission" | "worker" | "subscribe" | "save";

export type PushFailure = { step: PushStep; name: string; message: string };

const STEP_LABEL: Record<PushStep, string> = {
  permission: "permissão",
  worker: "service worker",
  subscribe: "inscrição no push",
  save: "salvar no KAIROS",
};

/** O caminho da opção que o Brave deixa desligada por padrão. */
export const BRAVE_PUSH_PATH =
  "Brave → menu ⋮ → Configurações → Privacidade e segurança → ligue “Usar os serviços do Google para mensagens push”";

/** Guarda nome e mensagem do erro do navegador, seja ele o que for. */
export function toFailure(step: PushStep, err: unknown): PushFailure {
  const e = (typeof err === "object" && err !== null ? err : {}) as { name?: unknown; message?: unknown };
  const name = typeof e.name === "string" && e.name ? e.name : "Error";
  const message = typeof e.message === "string" ? e.message : typeof err === "string" ? err : "";
  return { step, name, message: message.slice(0, 200) };
}

/** O serviço de push (Google) não respondeu ou recusou: rede, Play Services, Brave… */
function pushServiceTrouble(f: PushFailure): boolean {
  return (
    f.name === "AbortError" ||
    f.name === "TimeoutError" ||
    /push service|registration failed|gcm|fcm/i.test(f.message)
  );
}

/** O que dizer para a pessoa, com o que fazer. */
export function pushFailureHelp(f: PushFailure, env: { brave: boolean }): string {
  switch (f.step) {
    case "permission":
      return "O navegador não mostrou o pedido de permissão. Atualize o navegador e tente de novo.";
    case "worker":
      return "A parte do app que recebe as notificações não carregou. Feche o KAIROS por completo (tire dos apps recentes), abra de novo e tente outra vez.";
    case "save":
      return "O celular aceitou, mas não consegui guardar a inscrição no KAIROS. Confira a internet e tente de novo.";
    case "subscribe":
      // o navegador diz “sem permissão” mesmo depois do “Permitir”: vale a
      // permissão do site dentro do navegador, não só a do app no Android
      if (f.name === "NotAllowedError" || /permission denied/i.test(f.message)) {
        return "O navegador diz que o KAIROS não tem permissão, mesmo com o app liberado no Android. Abra o navegador em que instalou o KAIROS → menu ⋮ → Configurações → Configurações do site → Notificações, deixe o KAIROS como Permitido e tente de novo.";
      }
      if (f.name === "InvalidAccessError" || f.name === "InvalidCharacterError") {
        return "O celular não aceitou a chave de notificações do KAIROS. Isso é ajuste do nosso lado: mande o detalhe abaixo.";
      }
      if (env.brave) {
        return `No Brave, o envio de notificações vem desligado. Abra o ${BRAVE_PUSH_PATH}. Depois feche o KAIROS por completo e tente de novo. Ou instale o KAIROS pelo Chrome.`;
      }
      if (pushServiceTrouble(f)) {
        return "O celular não conseguiu falar com o serviço de notificações do Google. Confira a internet, se o Google Play Services está atualizado e se a economia de bateria não está travando o navegador. Se instalou o KAIROS por outro navegador, instale pelo Chrome.";
      }
      return "O navegador não deixou ativar. Tente de novo; se continuar, mande o detalhe abaixo.";
  }
}

/** Uma linha técnica curta, para a pessoa poder mandar um print. */
export function pushFailureDetail(f: PushFailure): string {
  return `${STEP_LABEL[f.step]} · ${f.name}${f.message ? `: ${f.message}` : ""}`.slice(0, 180);
}
