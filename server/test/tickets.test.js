import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { criarApp } from "../src/app.js";

let base, servidor;
const chamar = async (metodo, caminho, corpo) => {
  const r = await fetch(base + caminho, { method: metodo, headers: { "content-type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, dados: r.status === 204 ? null : await r.json() };
};

before(async () => {
  ({ servidor } = criarApp());
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test("há um ticket de exemplo na primeira execução", async () => {
  const r = await chamar("GET", "/api/tickets");
  assert.equal(r.status, 200);
  assert.ok(r.dados.tickets.length >= 1);
  assert.equal(typeof r.dados.tickets[0].description, "string");
  const d = await chamar("GET", `/api/tickets/${r.dados.tickets[0].id}`);
  assert.ok(d.dados.messages.length >= 1);
});

test("abrir ticket exige título e descrição; a descrição vira a primeira mensagem", async () => {
  const r = await chamar("POST", "/api/tickets", { title: "  Cartões não movem  ", description: "  Ao arrastar um cartão para outra lista ele volta.  " });
  assert.equal(r.status, 201);
  assert.equal(r.dados.ticket.title, "Cartões não movem");
  assert.equal(r.dados.ticket.description, "Ao arrastar um cartão para outra lista ele volta.");
  assert.equal(r.dados.messages[0].content, r.dados.ticket.description);
  assert.equal(r.dados.ticket.status, "open");
  assert.equal(r.dados.messages.length, 1);
  assert.equal(r.dados.messages[0].author, "user");
  assert.equal((await chamar("POST", "/api/tickets", { title: "Só título" })).status, 400);
  assert.equal((await chamar("POST", "/api/tickets", { description: "Só descrição" })).status, 400);
  assert.equal((await chamar("POST", "/api/tickets", { title: "   ", description: "x" })).status, 400);
});

test("mensagens entram em ordem e ticket encerrado não recebe resposta", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { title: "Meu problema", description: "Primeira" })).dados;
  assert.equal(ticket.title, "Meu problema");
  await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Segunda" });
  const d = (await chamar("GET", `/api/tickets/${ticket.id}`)).dados;
  assert.deepEqual(d.messages.map((m) => m.content), ["Primeira", "Segunda"]);
  assert.equal((await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "closed" })).dados.ticket.status, "closed");
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Terceira" })).status, 409);
  assert.equal((await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "x" })).status, 400);
  await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "open" });
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Terceira" })).status, 201);
});

test("excluir apaga o ticket e as mensagens; id inexistente dá 404", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { title: "Apagar", description: "Apagar" })).dados;
  assert.equal((await chamar("DELETE", `/api/tickets/${ticket.id}`)).status, 204);
  assert.equal((await chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "x" })).status, 404);
});
