// Atendimento: tickets de suporte, cada um é uma conversa (mensagens em ordem). Contrato JSON em inglês.
// Hoje só o usuário escreve (author "user"); a coluna author já comporta "agent" para os agentes autônomos.
import { randomUUID } from "node:crypto";
import { ErroHttp, invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";
import { criarIssue, lerPublicacoes } from "./github.js";

const STATUS = ["open", "closed"];
const saidaTicket = (t) => ({ id: t.id, title: t.title, description: t.description, issueNumber: t.issue_number ?? null, phase: t.fase ?? null, prUrl: t.pr_url ?? null, status: t.status, createdAt: t.criado_em, updatedAt: t.atualizado_em });
const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, author: m.author, content: m.content, createdAt: m.criado_em });

const ultimaSincronia = new Map();
const INTERVALO_SINCRONIA_MS = 5_000;

export function rotasDeTickets(app, db) {
  const buscar = (id) => {
    const t = db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
    if (!t) throw naoEncontrado("Ticket");
    return t;
  };
  const mensagens = (ticketId) =>
    db.prepare("SELECT * FROM ticket_message WHERE ticket_id = ? ORDER BY criado_em, rowid").all(ticketId).map(saidaMensagem);
  const inserirMensagem = (ticketId, author, content) => {
    const agora = new Date().toISOString();
    const m = { id: randomUUID(), ticket_id: ticketId, author, content, criado_em: agora };
    db.prepare("INSERT INTO ticket_message (id, ticket_id, author, content, criado_em) VALUES (?, ?, ?, ?, ?)")
      .run(m.id, ticketId, author, content, agora);
    db.prepare("UPDATE ticket SET atualizado_em = ? WHERE id = ?").run(agora, ticketId);
    return saidaMensagem(m);
  };

  app.get("/api/tickets", () => ({
    tickets: db.prepare("SELECT * FROM ticket ORDER BY atualizado_em DESC, rowid DESC").all().map(saidaTicket),
  }));

  /** Espelha no ticket as mensagens públicas do N1 e a fase publicadas na issue. Falha de rede não derruba a leitura. */
  const sincronizar = async (t, forcar = false) => {
    if (!t.issue_number || t.fase === "concluido") return;
    if (!forcar && Date.now() - (ultimaSincronia.get(t.id) ?? 0) < INTERVALO_SINCRONIA_MS) return;
    ultimaSincronia.set(t.id, Date.now());
    try {
      const { publicas, estado } = await lerPublicacoes(t.issue_number);
      const enviadas = JSON.parse(t.mensagens_enviadas);
      for (const p of publicas.filter((p) => !enviadas.includes(p.id))) {
        inserirMensagem(t.id, "agent", p.texto);
        enviadas.push(p.id);
      }
      db.prepare("UPDATE ticket SET mensagens_enviadas = ?, fase = ?, pr_url = ?, request_id = ? WHERE id = ?")
        .run(JSON.stringify(enviadas), estado?.phase ?? t.fase, estado?.pr ?? t.pr_url, estado?.requestId ?? t.request_id, t.id);
    } catch (e) { console.error("Sincronia com o GitHub falhou:", e.message); }
  };

  app.post("/api/tickets", async ({ corpo }) => {
    const title = texto(corpo, "title", { max: 120 });
    const description = texto(corpo, "description", { max: 4000 });
    const agora = new Date().toISOString();
    const ticket = { id: randomUUID() };
    transacao(db, () => {
      db.prepare("INSERT INTO ticket (id, title, description, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)")
        .run(ticket.id, title, description, "open", agora, agora);
      inserirMensagem(ticket.id, "user", description);
    });
    // Mesma issue para todo o trabalho do ticket. Se o GitHub falhar, o ticket continua valendo (sem issue).
    try {
      const numero = await criarIssue(db.prepare("SELECT * FROM ticket WHERE id = ?").get(ticket.id));
      if (numero) db.prepare("UPDATE ticket SET issue_number = ?, fase = ? WHERE id = ?").run(numero, "aberto", ticket.id);
    } catch (e) { console.error("Não foi possível criar a issue:", e.message); }
    return { ticket: saidaTicket(db.prepare("SELECT * FROM ticket WHERE id = ?").get(ticket.id)), messages: mensagens(ticket.id) };
  });

  app.get("/api/tickets/:id", async ({ params, url }) => {
    await sincronizar(buscar(params.id), url.searchParams.get("atualizar") === "1");
    return { ticket: saidaTicket(buscar(params.id)), messages: mensagens(params.id) };
  });

  app.post("/api/tickets/:id/messages", ({ params, corpo }) => {
    const ticket = buscar(params.id);
    if (ticket.status === "closed") throw new ErroHttp(409, "Este ticket está encerrado. Reabra para responder.");
    const content = texto(corpo, "content", { max: 4000 });
    return { message: inserirMensagem(ticket.id, "user", content) };
  });

  app.patch("/api/tickets/:id", ({ params, corpo }) => {
    buscar(params.id);
    const title = texto(corpo, "title", { max: 120, opcional: true });
    const status = corpo.status;
    if (status !== undefined && !STATUS.includes(status)) throw invalido("status deve ser open ou closed.");
    if (title !== undefined) db.prepare("UPDATE ticket SET title = ? WHERE id = ?").run(title, params.id);
    if (status !== undefined) db.prepare("UPDATE ticket SET status = ? WHERE id = ?").run(status, params.id);
    db.prepare("UPDATE ticket SET atualizado_em = ? WHERE id = ?").run(new Date().toISOString(), params.id);
    return { ticket: saidaTicket(buscar(params.id)) };
  });

  app.delete("/api/tickets/:id", ({ params }) => {
    buscar(params.id);
    db.prepare("DELETE FROM ticket WHERE id = ?").run(params.id);
  });
}
