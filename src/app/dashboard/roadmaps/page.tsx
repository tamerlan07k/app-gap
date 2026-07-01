export default function RoadmapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your saved roadmaps will appear here once you generate them.
        </p>
      </div>

      {/* Future: saved roadmap cards rendered here */}
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          My generated roadmaps will appear here.
        </p>
      </div>
    </div>
  );
}
