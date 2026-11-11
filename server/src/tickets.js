// Atendimento: tickets de suporte, cada um é uma conversa (mensagens em ordem). Contrato JSON em inglês.
// Hoje só o usuário escreve (author "user"); a coluna author já comporta "agent" para os agentes autônomos.
import { randomUUID } from "node:crypto";
import { ErroHttp, invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";

const STATUS = ["open", "closed"];
const saidaTicket = (t) => ({ id: t.id, title: t.title, description: t.description, status: t.status, createdAt: t.criado_em, updatedAt: t.atualizado_em });
const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, author: m.author, content: m.content, createdAt: m.criado_em });

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

  app.post("/api/tickets", ({ corpo }) => {
    const title = texto(corpo, "title", { max: 120 });
    const description = texto(corpo, "description", { max: 4000 });
    const agora = new Date().toISOString();
    const ticket = { id: randomUUID() };
    transacao(db, () => {
      db.prepare("INSERT INTO ticket (id, title, description, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)")
        .run(ticket.id, title, description, "open", agora, agora);
      inserirMensagem(ticket.id, "user", description);
    });
    return { ticket: saidaTicket(db.prepare("SELECT * FROM ticket WHERE id = ?").get(ticket.id)), messages: mensagens(ticket.id) };
  });

  app.get("/api/tickets/:id", ({ params }) => ({ ticket: saidaTicket(buscar(params.id)), messages: mensagens(params.id) }));

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
