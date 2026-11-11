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
