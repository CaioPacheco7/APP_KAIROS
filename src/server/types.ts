/** Estado devolvido pelas Server Actions de formulário. */
export type ActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const initialActionState: ActionState = { status: "idle" };
