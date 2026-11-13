"use client";

import { useState, useTransition } from "react";
import {
  initialActionState,
  type ActionState,
} from "@/server/types";

/**
 * Envia um <form> para uma Server Action SEM o reset automático de campos do
 * React 19 (que apagaria o que a pessoa digitou quando há erro de validação).
 */
export function useServerForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  onSuccess?: () => void,
) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(state, formData);
      setState(result);
      if (result.status === "success") onSuccess?.();
    });
  }

  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name] : undefined;

  const formError =
    state.status === "error" && !state.fieldErrors ? state.message : undefined;

  return { state, pending, onSubmit, fieldError, formError };
}
