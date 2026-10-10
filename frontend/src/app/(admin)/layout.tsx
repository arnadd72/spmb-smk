import { AdminShell } from "@/components/layout/admin-shell";

export default function LayoutAdmin({ children }: LayoutProps<"/">) {
  return <AdminShell>{children}</AdminShell>;
}
