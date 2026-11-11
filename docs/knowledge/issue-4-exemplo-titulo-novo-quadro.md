---
id: issue-4
type: change
issue: 4
pr: 5
title: Trocar o exemplo do título no diálogo Novo quadro
status: merged
date: 2026-11-11
files: [client/src/App.jsx]
tags: [texto, placeholder, quadro, dialogo, novo-quadro]
summary: O campo de título do diálogo "Novo quadro" mostrava "Ex.: Lançamento do site"; passou a mostrar "Ex.: Campanha de março".
relacionados: []
---

## Pedido
O cliente pediu que o exemplo exibido no campo de título do diálogo "Novo quadro" mudasse de "Ex.: Lançamento do site" para "Ex.: Campanha de março". Indicou `client/src/App.jsx` como arquivo provável.

## O que foi feito
Em `client/src/App.jsx`, no diálogo "Novo quadro", a propriedade `placeholder` do campo "Título do quadro" passou a ser "Ex.: Campanha de março". Nenhum outro texto ou comportamento mudou. PR #5, integrado na `main`.

## Por quê
Mudança de texto simples, dentro do trecho de quadros do `App.jsx` (caminho permitido pela política de autonomia). O cliente digitou sem acentos; o texto do app foi mantido em português com acentos, como o resto da interface.

## Como conferir
Abrir o app, ir em Quadros, clicar em "+" (Criar quadro) e olhar o exemplo cinza dentro do campo "Título do quadro". `npm run build` passa.

## Quando consultar
Pedidos para trocar textos de exemplo, rótulos ou mensagens do diálogo de quadros. Os textos do diálogo de novo quadro ficam todos em `client/src/App.jsx` (o campo de título, o botão de confirmar e a descrição do diálogo).
