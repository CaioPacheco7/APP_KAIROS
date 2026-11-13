"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/** Botão de submit que pede confirmação antes de enviar o <form>. */
export function ConfirmButton({
  message,
  children,
  ...props
}: { message: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
