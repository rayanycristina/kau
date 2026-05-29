import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#02060d] text-white/60">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
