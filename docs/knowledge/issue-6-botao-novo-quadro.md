---
id: issue-6
type: change
issue: 6
pr: 7
title: Trocar o texto do botão do diálogo Novo quadro
status: merged
date: 2026-11-11
files: [client/src/App.jsx]
tags: [texto, botao, quadro, dialogo, novo-quadro]
summary: O botão de confirmar do diálogo "Novo quadro" mostrava "Criar quadro"; passou a mostrar "Criar meu quadro".
relacionados: [issue-4]
---

## Pedido
O cliente queria que o botão de confirmar do diálogo "Novo quadro" mostrasse "Criar meu quadro" em vez de "Criar quadro", sem mudar nenhum outro texto. Indicou `client/src/App.jsx`.

## O que foi feito
Em `client/src/App.jsx`, o botão de envio do formulário do diálogo "Novo quadro" passou a ter o texto "Criar meu quadro". PR #7, integrado na `main`.

## Por quê
O mesmo texto "Criar quadro" também aparece em outros lugares (por exemplo, o botão do estado vazio da tela de quadros e o rótulo acessível do "+" na lateral). O pedido dizia "só esse botão", então só o do diálogo foi alterado.

## Como conferir
Abrir o app, clicar em "+" para criar um quadro e olhar o botão azul do diálogo. `npm run build` passa.

## Quando consultar
Pedidos para trocar rótulos de botões do quadro. Antes de trocar um texto, procure se ele aparece em mais de um lugar (`Grep` no `client/src`) e confirme com o cliente o alcance quando o pedido não for explícito. Veja também `issue-4`, do mesmo diálogo.
