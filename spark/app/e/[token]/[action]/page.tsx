import { EmailAction } from "@/components/EmailAction";
import { Shell } from "@/components/ui";

export const metadata = { title: "Spark", robots: { index: false } };

// Where buttons in emails land. The page itself does the action (so link-scanners don't).
export default async function EmailActionPage({ params }: { params: Promise<{ token: string; action: string }> }) {
  const { token, action } = await params;
  return (
    <Shell>
      <EmailAction token={token} action={action} />
    </Shell>
  );
}
