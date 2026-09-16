import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const user = await getCurrentUser();
  if (user && (user.role === "admin" || user.email === "admin@oatsandco.in" || user.email === "test@gmail.com")) {
    redirect("/admin/dashboard");
  } else {
    redirect("/admin/login");
  }
}
