// Ponte do atendimento com o GitHub: cria a issue do ticket e lê o que o controlador publicou nela.
// AGENT_RUNTIME=github-native liga; AGENT_DRY_RUN (padrão true) só registra no log, sem chamar o GitHub.
// Credencial local do backend: GITHUB_ISSUES_TOKEN (só criar/ler issues). Não é o COPILOT_AGENT_TOKEN das Actions.
const BOT_CONTROLADOR = "github-actions[bot]";

export const config = () => ({
  ativo: process.env.AGENT_RUNTIME === "github-native",
  seco: process.env.AGENT_DRY_RUN !== "false",
  repo: process.env.GITHUB_REPO,
  token: process.env.GITHUB_ISSUES_TOKEN,
});

async function gh(metodo, caminho, corpo) {
  const { token } = config();
  const r = await fetch(`https://api.github.com${caminho}`, {
    method: metodo,
    headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`GitHub respondeu ${r.status}.`);
  return r.json();
}

export const montarIssue = (ticket) => ({
  title: ticket.title,
  body: `${ticket.description}\n\n---\nTicket do app: \`${ticket.id}\`\n<!-- ticket-id:${ticket.id} -->`,
  labels: ["origin:app"],
});

/** Cria a issue origin:app do ticket e devolve o número (null se desligado ou em dry-run). */
export async function criarIssue(ticket) {
  const c = config();
  if (!c.ativo) return null;
  const issue = montarIssue(ticket);
  if (c.seco) { console.log("[dry-run] criaria a issue:", JSON.stringify(issue)); return null; }
  if (!c.repo || !c.token) throw new Error("Defina GITHUB_REPO e GITHUB_ISSUES_TOKEN.");
  return (await gh("POST", `/repos/${c.repo}/issues`, issue)).number;
}

/** Lê o que o controlador publicou: mensagens públicas do N1 e o último estado. Só comentários do github-actions[bot] valem. */
export async function lerPublicacoes(issueNumber) {
  const { repo } = config();
  const comentarios = await gh("GET", `/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
  const doControlador = comentarios.filter((c) => c.user?.login === BOT_CONTROLADOR);
  const publicas = [];
  let estado = null;
  for (const c of doControlador) {
    const m = /^<!-- app-public:([\w-]{1,40}) -->\n([\s\S]*)$/.exec(c.body ?? "");
    if (m) publicas.push({ id: m[1], texto: m[2].trim().slice(0, 4000) });
    const e = /<!-- app-state (\{.*?\}) -->/.exec(c.body ?? "");
    if (e) { try { estado = JSON.parse(e[1]); } catch { /* ignora marcador inválido */ } }
  }
  return { publicas, estado };
}
