import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { Botao } from "./componentes/Botao.jsx";
import { Icone } from "./componentes/Icone.jsx";

const INTERVALO_MS = 4000;

/** Estado do atendimento: lista de tickets, ticket aberto (null = nova conversa) e ações. */
export function useAtendimento(ativo) {
  const [tickets, setTickets] = useState(null);
  const [ticketId, setTicketId] = useState(null);
  const [conversa, setConversa] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);

  const falhar = (e) => setErro(e.message);

  const recarregarLista = useCallback(
    () => api.tickets.listar().then((d) => setTickets(d?.tickets ?? [])),
    [],
  );

  // Lista: carrega ao entrar na tela.
  useEffect(() => {
    if (!ativo) return;
    recarregarLista().then(() => setErro(null)).catch((e) => { setTickets([]); falhar(e); });
  }, [ativo, recarregarLista]);

  // Conversa aberta: carrega ao trocar de ticket e consulta de tempos em tempos (respostas de agentes).
  useEffect(() => {
    if (!ativo || !ticketId) {
      setConversa(null);
      return;
    }
    let vivo = true;
    const carregar = () =>
      api.tickets.detalhe(ticketId).then((d) => {
        if (!vivo) return;
        setConversa((atual) => (atual?.messages?.length === d.messages.length && atual?.ticket.status === d.ticket.status && atual?.ticket.title === d.ticket.title && atual?.ticket.phase === d.ticket.phase ? atual : d));
      });
    setConversa(null);
    carregar().then(() => vivo && setErro(null)).catch((e) => vivo && falhar(e));
    const timer = setInterval(() => { carregar().catch(() => {}); recarregarLista().catch(() => {}); }, INTERVALO_MS);
    return () => { vivo = false; clearInterval(timer); };
  }, [ativo, ticketId, recarregarLista]);

  const executar = async (acao) => {
    try { setErro(null); return await acao(); } catch (e) { falhar(e); return undefined; }
  };

  const enviar = async (texto, titulo) => {
    setEnviando(true);
    try {
      await executar(async () => {
        if (!ticketId) {
          const r = await api.tickets.criar(titulo, texto);
          setConversa(r);
          setTicketId(r.ticket.id);
        } else {
          await api.tickets.responder(ticketId, texto);
          setConversa(await api.tickets.detalhe(ticketId));
        }
        await recarregarLista();
      });
    } finally { setEnviando(false); }
  };

  /** Botão "Atualizar": força a busca na issue agora, sem esperar o ciclo automático. */
  const atualizar = async () => {
    if (!ticketId) return;
    setAtualizando(true);
    try {
      await executar(async () => {
        setConversa(await api.tickets.detalhe(ticketId, true));
        await recarregarLista();
      });
    } finally { setAtualizando(false); }
  };

  const mudarStatus = (status) => executar(async () => {
    await api.tickets.mudar(ticketId, { status });
    setConversa(await api.tickets.detalhe(ticketId));
    await recarregarLista();
  });

  const excluir = (id) => executar(async () => {
    await api.tickets.excluir(id);
    if (id === ticketId) setTicketId(null);
    await recarregarLista();
  });

  return { tickets, ticketId, conversa, enviando, atualizando, erro, abrir: setTicketId, novo: () => setTicketId(null), enviar, atualizar, mudarStatus, excluir };
}

const formatarHora = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Conteúdo da lateral no atendimento: botão de nova conversa + tickets, como o histórico de um chat. */
export function ListaTickets({ tickets, ticketId, aoAbrir, aoNovo, aoExcluir }) {
  return (
    <>
      <Botao className="botao-bloco" icone="mais" onClick={aoNovo}>Novo ticket</Botao>
      <h2 className="lateral-titulo">Seus tickets</h2>
      {tickets === null ? (
        <p className="lateral-vazio">Carregando tickets…</p>
      ) : tickets.length ? (
        <ul className="lateral-lista">
          {tickets.map((t) => (
            <li key={t.id}>
              <div className="lateral-item" data-ativo={t.id === ticketId ? "" : undefined}>
                <button type="button" className="lateral-escolha" aria-current={t.id === ticketId ? "page" : undefined} onClick={() => aoAbrir(t.id)}>
                  <span className="ticket-linha">
                    <span className="ticket-ponto" data-status={t.status} title={t.status === "open" ? "Aberto" : "Encerrado"} />
                    <span className="ticket-titulo">{t.title}</span>
                  </span>
                </button>
                <span className="lateral-acoes">
                  <Botao variante="fantasma" icone="lixeira" aria-label={`Excluir ticket ${t.title}`} onClick={() => aoExcluir(t)} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lateral-vazio">Nenhum ticket ainda. Abra o primeiro.</p>
      )}
    </>
  );
}

function Composer({ desabilitado, enviando, aoEnviar, placeholder }) {
  const [valor, setValor] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [valor]);

  const enviar = async () => {
    const texto = valor.trim();
    if (!texto || enviando || desabilitado) return;
    setValor("");
    await aoEnviar(texto);
    ref.current?.focus();
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
      <textarea
        ref={ref}
        className="composer-entrada"
        rows={1}
        value={valor}
        maxLength={4000}
        disabled={desabilitado}
        placeholder={placeholder}
        aria-label="Mensagem"
        autoFocus
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); }
        }}
      />
      <button type="submit" className="composer-enviar" aria-label="Enviar mensagem" disabled={!valor.trim() || enviando || desabilitado}>
        <Icone nome="enviar" tamanho={18} />
      </button>
    </form>
  );
}

/** Abertura de ticket: título curto + descrição detalhada (o formato de uma issue). */
function FormularioTicket({ enviando, aoEnviar }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const pronto = titulo.trim() && descricao.trim();
  return (
    <form
      className="ticket-form"
      onSubmit={(e) => { e.preventDefault(); if (pronto && !enviando) void aoEnviar(descricao.trim(), titulo.trim()); }}
    >
      <label className="campo">
        <span className="campo-rotulo">Título</span>
        <input className="campo-entrada" value={titulo} maxLength={120} required autoFocus placeholder="Resumo curto do problema ou da dúvida" onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="campo">
        <span className="campo-rotulo">Descrição</span>
        <textarea className="campo-entrada" value={descricao} maxLength={4000} required rows={7} placeholder="O que aconteceu? O que você esperava? Passos para reproduzir, mensagens de erro, links…" onChange={(e) => setDescricao(e.target.value)} />
      </label>
      <div className="acoes">
        <Botao variante="primario" type="submit" disabled={!pronto || enviando}>Abrir ticket</Botao>
      </div>
    </form>
  );
}

/** Tela principal: conversa do ticket aberto, ou o convite para abrir um novo. */
const FASES = {
  aberto: "Issue criada",
  atribuido: "Agentes acionados",
  "em-andamento": "Em andamento",
  "pronto-para-revisao": "PR pronto",
  integrado: "Código integrado",
  concluido: "Concluído",
  "aguardando-cliente": "Aguardando você",
  "revisao-humana": "Com o instrutor",
  "pendencia-instrutor": "Pendência com o instrutor",
  encerrado: "Encerrado",
};

export function TelaAtendimento({ ticketId, conversa, enviando, atualizando, aoEnviar, aoAtualizar, aoEncerrar, aoReabrir }) {
  const fim = useRef(null);
  const total = conversa?.messages?.length ?? 0;

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [total, ticketId]);

  if (!ticketId) {
    return (
      <section className="chat chat-novo" aria-label="Novo ticket">
        <div className="chat-boas-vindas">
          <span className="chat-selo" aria-hidden="true"><Icone nome="chat" tamanho={22} /></span>
          <h1>Como podemos ajudar?</h1>
          <p>Descreva o que está acontecendo. Cada ticket vira uma conversa e você acompanha as respostas aqui.</p>
        </div>
        <FormularioTicket enviando={enviando} aoEnviar={aoEnviar} />
      </section>
    );
  }

  if (!conversa) return <p className="carregando-line" role="status">Carregando conversa…</p>;

  const { ticket, messages } = conversa;
  const encerrado = ticket.status === "closed";
  const aguardando = !encerrado && messages.at(-1)?.author === "user";

  return (
    <section className="chat" aria-label={`Ticket ${ticket.title}`}>
      <header className="chat-topo">
        <div className="chat-topo-texto">
          <h1 className="chat-titulo">{ticket.title}</h1>
          <span className="chat-estado" data-status={ticket.status}>{encerrado ? "Encerrado" : "Aberto"}</span>
          {ticket.phase ? <span className="chat-fase" title="Andamento na issue">{FASES[ticket.phase] ?? ticket.phase}</span> : null}
        </div>
        <div className="chat-topo-acoes">
          {ticket.issueNumber ? (
            <Botao icone="atualizar" disabled={atualizando} aria-label="Atualizar agora" title="Buscar novidades na issue agora" onClick={aoAtualizar}>
              {atualizando ? "Atualizando…" : "Atualizar"}
            </Botao>
          ) : null}
          {encerrado
            ? <Botao icone="atualizar" onClick={aoReabrir}>Reabrir</Botao>
            : <Botao icone="check" onClick={aoEncerrar}>Encerrar ticket</Botao>}
        </div>
      </header>

      <div className="chat-rolagem">
        <ol className="mensagens" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id} className="mensagem" data-autor={m.author}>
              {m.author === "user" ? null : <span className="mensagem-avatar" aria-hidden="true"><Icone nome="chat" tamanho={16} /></span>}
              <div className="mensagem-corpo">
                <p className="mensagem-texto">{m.content}</p>
                <time className="mensagem-hora" dateTime={m.createdAt}>{m.author === "user" ? "Você" : "Atendimento"} · {formatarHora(m.createdAt)}</time>
              </div>
            </li>
          ))}
          {aguardando ? (
            <li className="mensagem" data-autor="agent" role="status">
              <span className="mensagem-avatar" aria-hidden="true"><Icone nome="chat" tamanho={16} /></span>
              <div className="mensagem-corpo"><p className="mensagem-texto mensagem-espera">Aguardando um agente<span className="pontos" aria-hidden="true"><i /><i /><i /></span></p></div>
            </li>
          ) : null}
        </ol>
        <div ref={fim} />
      </div>

      <Composer
        key={ticket.id}
        enviando={enviando}
        desabilitado={encerrado}
        aoEnviar={aoEnviar}
        placeholder={encerrado ? "Ticket encerrado. Reabra para responder." : "Escreva uma mensagem…"}
      />
    </section>
  );
}
