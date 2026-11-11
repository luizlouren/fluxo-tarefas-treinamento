# Progresso: automação do atendimento

## Etapa 00: preparar o projeto e o acesso

- **Cópia do projeto:** https://github.com/luizlouren/fluxo-tarefas-treinamento (público; visibilidade mantida)
- **Original do professor:** remote `upstream` (https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1), sem push configurado
- **Node:** v22.18.0 (o projeto exige >= 22.13.0)
- **Abrir o app:** `npm run dev` na raiz. Interface em http://127.0.0.1:5173 e API em http://127.0.0.1:3001/api
- **Instalação:** `npm install` (65 pacotes, 0 vulnerabilidades)
- **Build:** `npm run build` passou (vite build). `npm test`: 22 de 22 passaram.
- **Dados locais:** o banco SQLite fica em `server/dados` (fora do git) e foi preservado.

### Acesso ao GitHub Copilot cloud agent

- **Actions:** habilitadas no repositório (`allowed_actions: all`).
- **Plano do Copilot:** Free (informado pelo usuário). O Copilot cloud agent exige plano pago (Pro, Pro+, Business ou Enterprise), então **fica pendente**. Enquanto isso, os arquivos de agentes (`.github/agents/*.agent.md`) e workflows são montados só localmente.
- **Secret `COPILOT_AGENT_TOKEN`:** ainda não existe (nenhum secret no repositório). Fica para uma etapa seguinte, separado da credencial local do backend. O valor nunca vai para arquivos ou logs.

### Pendências

- Obter plano pago do Copilot (ou o Copilot Pro gratuito para estudantes/professores, via education.github.com/pack) e habilitar o cloud agent.
- Criar o secret `COPILOT_AGENT_TOKEN` (etapa futura).
- Sem ticket de teste e sem configuração remota nesta etapa.

## Etapa 03: app, issue e coordenador

- **Fluxo:** ticket no app → backend cria a issue `origin:app` (`server/src/github.js`) e guarda issue, requestId, PR, fase e ids de mensagens já espelhadas na tabela `ticket` → workflow `native-agents.yml` roda `automacao/controlador.mjs` → registra requestId/resultPath e atribui a issue ao Copilot (`custom_agent=coordenador`) → o controlador lê o relatório do PR e publica na issue o resumo interno e a mensagem pública do N1 → o app espelha só as mensagens públicas do `github-actions[bot]`.
- **Configuração (nada configurado no remoto ainda):** variáveis do repositório `AGENT_RUNTIME=github-native` e `AGENT_DRY_RUN=true`; secret `COPILOT_AGENT_TOKEN` (usuário com Copilot pago); no backend local, `.env.example` (`GITHUB_ISSUES_TOKEN` é outra credencial). Em dry-run nada é escrito no GitHub.
- **Retomar:** Actions → native-agents → Run workflow com o número da issue.
- **Conferido localmente:** montagem da atribuição com dados fictícios (`node automacao/controlador.mjs --ensaio`); ticket fictício criado e lido pela API com o app em dry-run (log mostra a issue que seria criada); `npm test` 22/22 e `npm run build` ok.
- **Não conferido:** chamada real ao GitHub e ao Copilot (plano Free).
- **Motor antigo:** não existe neste projeto, nada a suspender.
- **Limite:** o app não tem login, então o ticket não tem "dono" por usuário; quem sabe o id do ticket o lê.
- **Atenção:** PRs abertos pelo Copilot podem exigir "Approve and run workflows" para o controlador rodar; use o workflow_dispatch se necessário.
