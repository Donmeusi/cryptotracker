import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { publicLoginUrl } from "@/lib/serverUrl";
import Sidebar from "@/components/sidebar/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect(await publicLoginUrl());

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
