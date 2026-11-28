import { describe, expect, it } from "vitest";
import { BRAVE_PUSH_PATH, pushFailureDetail, pushFailureHelp, toFailure } from "./push-errors";

const chrome = { brave: false };
const brave = { brave: true };

describe("toFailure", () => {
  it("guarda nome e mensagem do erro do navegador", () => {
    const err = Object.assign(new Error("Registration failed - push service error"), { name: "AbortError" });
    expect(toFailure("subscribe", err)).toEqual({
      step: "subscribe",
      name: "AbortError",
      message: "Registration failed - push service error",
    });
  });

  it("aguenta erro que não é Error (texto, nulo)", () => {
    expect(toFailure("save", "caiu")).toEqual({ step: "save", name: "Error", message: "caiu" });
    expect(toFailure("worker", null)).toEqual({ step: "worker", name: "Error", message: "" });
  });

  it("corta mensagens enormes", () => {
    expect(toFailure("subscribe", new Error("x".repeat(500))).message).toHaveLength(200);
  });
});

describe("pushFailureHelp", () => {
  const abort = toFailure("subscribe", Object.assign(new Error("Registration failed - push service error"), { name: "AbortError" }));

  it("no Brave, aponta a opção do push do Google", () => {
    const text = pushFailureHelp(abort, brave);
    expect(text).toContain(BRAVE_PUSH_PATH);
    expect(text).toContain("Chrome");
  });

  it("no Chrome, falha do serviço de push fala de Google Play Services e bateria", () => {
    const text = pushFailureHelp(abort, chrome);
    expect(text).toMatch(/Google Play Services/);
    expect(text).toMatch(/bateria/);
    expect(text).not.toContain("Brave");
  });

  it("tempo esgotado conta como problema no serviço de push", () => {
    const timeout = toFailure("subscribe", Object.assign(new Error("sem resposta em 20 s"), { name: "TimeoutError" }));
    expect(pushFailureHelp(timeout, chrome)).toMatch(/serviço de notificações do Google/);
  });

  it("permissão recusada manda liberar nas configurações do site", () => {
    const denied = toFailure("subscribe", Object.assign(new Error("Registration failed - permission denied"), { name: "NotAllowedError" }));
    expect(pushFailureHelp(denied, chrome)).toMatch(/Configurações do site → Notificações/);
    // mesmo no Brave: aqui o problema é a permissão, não o push do Google
    expect(pushFailureHelp(denied, brave)).not.toContain(BRAVE_PUSH_PATH);
  });

  it("AbortError com “permission denied” (Chrome) também é permissão, não o serviço de push", () => {
    const abortDenied = toFailure("subscribe", Object.assign(new Error("Registration failed - permission denied"), { name: "AbortError" }));
    expect(pushFailureHelp(abortDenied, chrome)).toMatch(/Configurações do site → Notificações/);
    expect(pushFailureHelp(abortDenied, chrome)).not.toMatch(/Google Play Services/);
  });

  it("chave recusada é problema do servidor", () => {
    const key = toFailure("subscribe", Object.assign(new Error("The provided applicationServerKey is not valid."), { name: "InvalidAccessError" }));
    expect(pushFailureHelp(key, brave)).toMatch(/nosso lado/);
  });

  it("cada etapa tem a sua explicação", () => {
    expect(pushFailureHelp(toFailure("worker", new Error("x")), chrome)).toMatch(/Feche o KAIROS por completo/);
    expect(pushFailureHelp(toFailure("save", new Error("x")), chrome)).toMatch(/não consegui guardar/);
    expect(pushFailureHelp(toFailure("permission", new Error("x")), chrome)).toMatch(/pedido de permissão/);
  });

  it("erro desconhecido pede o detalhe", () => {
    const odd = toFailure("subscribe", Object.assign(new Error("algo"), { name: "UnknownError" }));
    expect(pushFailureHelp(odd, chrome)).toMatch(/detalhe abaixo/);
  });
});

describe("pushFailureDetail", () => {
  it("mostra etapa, nome e mensagem numa linha", () => {
    const f = toFailure("subscribe", Object.assign(new Error("push service error"), { name: "AbortError" }));
    expect(pushFailureDetail(f)).toBe("inscrição no push · AbortError: push service error");
  });

  it("sem mensagem, só o nome", () => {
    expect(pushFailureDetail({ step: "worker", name: "TimeoutError", message: "" })).toBe("service worker · TimeoutError");
  });
});
