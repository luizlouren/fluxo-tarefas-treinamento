# Fluxo: o que o app faz

Fluxo é um quadro de tarefas no estilo Trello, rodando local (React + Node + SQLite). Não há login na interface: quem abre o app já usa os quadros.

## Como usar

- **Abrir:** `npm run dev` na raiz. Interface em http://127.0.0.1:5173 (a página inicial) e os quadros em `/quadro`.
- **Quadros:** na lateral, "+" cria um quadro. Cada quadro tem menu para renomear e excluir. Excluir apaga as listas e os cartões dele.
- **Listas:** dentro do quadro, crie listas (as etapas do trabalho), renomeie ou exclua. Excluir uma lista apaga os cartões dela.
- **Cartões:** crie cartões em cada lista, com título e descrição opcional. Edite ou exclua pelo menu do cartão.
- **Mover cartões:** arraste o cartão para outra lista, ou use "Mover para" no menu do cartão.
- **Atendimento:** o item "Atendimento" na lateral (`/quadro#atendimento`). Cada ticket é uma conversa, aberto com título e descrição. Dá para responder, encerrar e reabrir. Os tickets não têm resposta automática no app: quem responde é o atendimento.

## O que o app não tem

Convites ou equipe, login na interface, etiquetas, datas de entrega, anexos, notificações e aplicativo de celular. Se alguém pedir isso, diga que hoje não existe e pergunte o resultado esperado.

## Dados

Os dados ficam no SQLite local (`server/dados/app.sqlite`), criado na primeira execução com quadros de exemplo.
