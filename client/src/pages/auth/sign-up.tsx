import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-white to-sky-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl bg-white/80 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl="/auth/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
