import { redirect } from "next/navigation";

export default async function GroupHomePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/dashboard/groups/${groupId}/timeline`);
}
