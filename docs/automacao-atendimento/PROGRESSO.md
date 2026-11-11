# Progresso: automação do atendimento

## Etapa 00: preparar o projeto e o acesso

- **Cópia do projeto:** https://github.com/luizlouren/fluxo-tarefas-treinamento (público; visibilidade mantida)
- **Original do professor:** remote `upstream` (https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1), sem push configurado
- **Node:** v22.18.0 (o projeto exige >= 22.13.0)
- **Abrir o app:** `npm run dev` na raiz. Interface em http://127.0.0.1:5173 e API em http://127.0.0.1:3001/api
- **Instalação:** `npm install` (65 pacotes, 0 vulnerabilidades)
- **Build:** `npm run build` passou (vite build). `npm test`: 22 de 22 passaram.
- **Dados locais:** o banco SQLite fica em `server/dados` (fora do git) e foi preservado.

### Acesso do agente (Copilot descartado; usamos Claude)

- **Actions:** habilitadas no repositório (`allowed_actions: all`).
- **Plano do Copilot:** Free, então **não usamos o Copilot**. Decisão do usuário: os agentes rodam com o Claude (assinatura do usuário), via `claude-code-action`. Ver a seção "Migração para o Claude".
- **Credencial das Actions:** `CLAUDE_CODE_OAUTH_TOKEN` (assinatura do usuário), ainda não criada. Fica separada da credencial local do backend. O valor nunca vai para arquivos ou logs.

### Pendências

- Criar o secret `CLAUDE_CODE_OAUTH_TOKEN` (o usuário roda `claude setup-token` e `gh secret set CLAUDE_CODE_OAUTH_TOKEN`).
- Sem ticket de teste e sem configuração remota nesta etapa.

## Etapa 03: app, issue e coordenador

- **Fluxo (versão inicial, antes da migração):** ticket no app → backend cria a issue `origin:app` (`server/src/github.js`) e guarda issue, requestId, PR, fase e ids de mensagens já espelhadas na tabela `ticket` → workflow `native-agents.yml` roda `automacao/controlador.mjs` → registra requestId/resultPath e atribuía a issue ao Copilot → o controlador lê o relatório do PR e publica na issue o resumo interno e a mensagem pública do N1 → o app espelha só as mensagens públicas do `github-actions[bot]`.
- **Configuração (nada configurado no remoto ainda):** variáveis do repositório `AGENT_RUNTIME=github-native` e `AGENT_DRY_RUN=true`; secret `COPILOT_AGENT_TOKEN` (usuário com Copilot pago); no backend local, `.env.example` (`GITHUB_ISSUES_TOKEN` é outra credencial). Em dry-run nada é escrito no GitHub.
- **Retomar:** Actions → native-agents → Run workflow com o número da issue.
- **Conferido localmente:** montagem da atribuição com dados fictícios (`node automacao/controlador.mjs --ensaio`); ticket fictício criado e lido pela API com o app em dry-run (log mostra a issue que seria criada); `npm test` 22/22 e `npm run build` ok.
- **Não conferido:** chamada real ao GitHub e ao agente.
- **Motor antigo:** não existe neste projeto, nada a suspender.
- **Limite:** o app não tem login, então o ticket não tem "dono" por usuário; quem sabe o id do ticket o lê.
- **Atenção:** PRs abertos por bots podem exigir "Approve and run workflows" para o controlador rodar; use o workflow_dispatch se necessário.

## Migração para o Claude

- **Agentes:** `.claude/agents/*.md` (coordenador, n1, comercial, po, banco, desenvolvedor, revisor) e `CLAUDE.md` na raiz. O coordenador roda como sessão principal e invoca os outros pela ferramenta Task.
- **Workflow `native-agents.yml`:** `registrar` (controlador registra requestId/resultPath) → `claude` (`anthropics/claude-code-action@v1`, só com `AGENT_DRY_RUN=false`) → `andamento` (controlador publica o relatório do PR na issue). A atribuição ao Copilot saiu do controlador.
- **Para valer de verdade:** (1) `claude setup-token` no terminal do usuário e `gh secret set CLAUDE_CODE_OAUTH_TOKEN`; (2) repositório → Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"; (3) variável `AGENT_DRY_RUN=false`; (4) rodar o workflow pela issue.
- **Limite:** PRs criados com o `GITHUB_TOKEN` não disparam outros workflows, por isso o andamento roda no mesmo workflow, depois do job do Claude.
