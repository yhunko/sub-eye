import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components";

export const Route = createFileRoute("/(protected)/dev/")({
  component: DevIndexPage,
});

function DevIndexPage() {
  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Developer Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Use internal dev utilities to test workflows without waiting for
            scheduled jobs.
          </p>
          <Button asChild>
            <Link to="/dev/notifications">Open Notification Test Page</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
