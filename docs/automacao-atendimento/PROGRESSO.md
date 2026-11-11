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

## Etapa 05: entrega e retomadas

- **Entrega:** o coordenador abre o PR (com `Refs #N`, sem fechar a issue) e grava `review` (veredito do Revisor) no relatório. O job `build` constrói o commit atual do PR sem segredos (`npm ci --ignore-scripts`, `npm run build`, `npm test`). O modo `entrega` do controlador só segue com build verde e `review.status: ok`. Com `AUTO_MERGE=false` (padrão, variável do repositório) o PR fica disponível para a demonstração. Com `AUTO_MERGE=true` ele integra exatamente o commit conferido (`sha` no merge, as regras da branch valem, sem bypass), publica a resposta do N1 (mensagem `final`, com ID estável) e fecha a issue. `answered` e `commercial` respondem e fecham sem merge (o PR só com relatório é fechado); `waiting-customer` e `human-review` mantêm o caso aberto. A mensagem diz que o código foi integrado e que o app local precisa ser atualizado (`git pull` e reiniciar), nunca que a máquina do aluno já está atualizada. O app mostra a resposta no ticket na próxima consulta.
- **Falha:** build ou revisão falhando pede UMA correção ao Claude no MESMO PR (job `corrigir`, erro curto e requestId, marcador `app-correcao`) e o fluxo é retomado sozinho. Se falhar de novo, o controlador publica a pendência (`app-pendencia`) e a fase `pendencia-instrutor`, e o instrutor decide. Nada de outro ticket ou outra issue.
- **Retomada:** Actions → native-agents → Run workflow com o número da issue. Todo passo relê a issue antes de agir (marcadores `native-agent`, `app-public:<id>`, `app-correcao`, `app-pendencia`, `app-state`), então rodar de novo não repete atribuição, mensagem, correção nem merge. Se o merge já aconteceu, a retomada só publica a resposta final (se faltar) e fecha a issue.
- **Conferido:** uma entrega com transporte simulado (GitHub falso, sem custo): build falho pede uma correção e a segunda falha vira pendência; `AUTO_MERGE=false` deixa o PR; `AUTO_MERGE=true` integra, responde e fecha; retomada pós-merge não duplica; o app recebe a resposta e a fase `concluido`.
- **Não conferido:** execução real nas Actions (o `AUTO_MERGE=true` não foi autorizado no repositório) e o job `corrigir`.
- **Investigação da issue #4 (resolvida):** o Claude fez todo o trabalho, mas o modo automático negou três comandos do Bash (`git checkout -b` não estava permitido, relatório por heredoc e comandos encadeados com `&&`). Correção: `git checkout` liberado, prompt manda usar Write, um comando por vez e `git switch -c`. Resultado real: PR #5 aberto com n1, po, desenvolvedor e revisor, build verde e `AUTO_MERGE=false` deixando o PR disponível.

## Chat em tempo real, resposta real do N1 e base de conhecimento

- **Tempo real:** o agente agora publica cada marco na issue enquanto trabalha (`gh issue comment` com `<!-- app-public:uK -->`, ids estáveis), em vez de tudo chegar no fim. O app sincroniza a cada 4 s com a tela do chat aberta (o backend consulta a issue no máximo a cada 5 s) e tem o botão "Atualizar" no topo do chat, que força a busca na hora. O topo mostra a fase ("Agentes acionados", "PR pronto", "Concluído"...). Só valem comentários do `github-actions[bot]`.
- **Resposta de verdade:** o N1 só escreve depois de analisar (base de conhecimento, `PRODUTO.md`, código) e é proibido de mandar confirmação genérica de recebimento. A mensagem tem que trazer o que foi encontrado, o que muda e onde, a resposta ou a pergunta que falta.
- **Base de conhecimento:** `docs/knowledge/` (formato em `README.md`, um arquivo por issue, com frontmatter). Todos os agentes consultam antes de trabalhar. O coordenador cria o arquivo depois de abrir o PR, no mesmo PR, então ele entra na `main` junto. Dúvidas sem código também levam o PR integrado com `AUTO_MERGE=true`, para o conhecimento não se perder. Já geradas: `issue-4` (PR #5) e `issue-6` (PR #7), os PRs integrados até agora. O PR #3 segue aberto e fica sem registro até ser resolvido.
- **Conferido:** simulação com GitHub falso (entrega, retomada e leitura forçada pelo app), `npm test` 22/22 e build. **Não conferido:** uma execução real do Claude publicando durante o trabalho e criando o arquivo de conhecimento.
