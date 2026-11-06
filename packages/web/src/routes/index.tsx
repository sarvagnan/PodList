import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home
})

function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">PodList</h1>
      <p className="mt-2 text-sm">Scaffold only. The real app shell lands with pod-cmo.5.</p>
    </main>
  )
}
