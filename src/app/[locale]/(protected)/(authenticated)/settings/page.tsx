import { redirect } from "next/navigation";

export default async function Settings() {
  return redirect("/settings/general");
}
