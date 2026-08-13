Deno.serve(async () => {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return new Response(JSON.stringify({ key: false }), { headers: { "content-type": "application/json" } });
  const out: Record<string, unknown> = { key: true, keyLen: key.length };
  const mini = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
  });
  out.miniStatus = mini.status;
  out.miniBody = (await mini.text()).slice(0, 400);
  const terra = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.6-terra", reasoning_effort: "none", messages: [{ role: "user", content: "hi" }] }),
  });
  out.terraStatus = terra.status;
  out.terraBody = (await terra.text()).slice(0, 400);
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
});
