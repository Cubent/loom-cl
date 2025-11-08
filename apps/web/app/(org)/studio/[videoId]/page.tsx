import { getCurrentUser } from "@cap/database/auth/session";
import { redirect } from "next/navigation";
import { StudioEditor } from "./_components/StudioEditor";

export default async function StudioModePage(props: {
	params: Promise<{ videoId: string }>;
}) {
	const params = await props.params;
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return <StudioEditor videoId={params.videoId} userId={user.id} />;
}

