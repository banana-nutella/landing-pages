"use client";
import { useActionState } from "react";
import { login } from "../actions";
import { Button, ErrorText, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-4">
      <input name="password" type="password" required autoFocus className={inputClass} placeholder="Password" />
      <ErrorText>{state?.error}</ErrorText>
      <Button className="mt-3" disabled={pending}>Log in</Button>
    </form>
  );
}
