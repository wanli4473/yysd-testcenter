import { redirect } from "next/navigation";

/** Legacy list → new wizard home */
export default function SchoolsPage() {
  redirect("/");
}
