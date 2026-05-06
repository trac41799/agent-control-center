import { useParams } from "react-router-dom";

export function PlaceholderPage() {
  const params = useParams();
  const route = Object.keys(params)[0] || "home";

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <h1 className="mb-2 text-2xl font-bold capitalize">{route}</h1>
      <p className="text-muted-foreground">
        This section is under construction. Agent will populate this area.
      </p>
    </div>
  );
}