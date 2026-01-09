import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/features/auth";

export default function Auth() {
  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  );
}
