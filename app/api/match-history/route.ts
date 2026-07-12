export async function GET() {
  return new Response(JSON.stringify({ message: "Match history API" }), {
    status: 200,
  });
}