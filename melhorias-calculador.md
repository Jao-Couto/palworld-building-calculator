# Melhorias — aba Calculadora

Complementa `redesign-palworld-calculator.md`. Foco: legibilidade das listas "Matérias-primas necessárias" e "Intermediários necessários".

## Problema atual

- Matérias-primas usam ícone por categoria (diamante, folha, brilho), mas intermediários usam sigla de 2 letras (CA, PL, SK...). Duas linguagens visuais diferentes na mesma tela.
- Todas as linhas têm o mesmo peso visual — 2.280 e 336 aparecem exatamente igual, sem indicação do que domina a receita.
- Números e nomes com contraste fraco contra o fundo escuro.
- Sem agrupamento, contagem de itens ou ordenação visível.
- Nome do item truncado no carrinho ("Lança-místeis de...") sem forma de ver o nome completo.

## Alterações

### 1. Unificar sistema de ícones

Todo item — raw ou intermediário — usa o mesmo padrão visual: quadrado 28x28px `rounded-md`, fundo da cor da categoria, ícone central. Remover as siglas de 2 letras dos intermediários e usar o mesmo mapeamento de ícone por categoria já definido no doc anterior (mineral, organic, tech, energy, other).

### 2. Barra de quantidade relativa

Cada linha ganha uma mini barra horizontal (5px de altura, `rounded-full`, ~70px de largura) entre o nome e o número, representando a quantidade daquele item relativa ao maior valor da lista (`largura = (valor / valorMáximo) * 100%`). Cor da barra = cor da categoria do item.

```jsx
<div className='w-[70px] h-[5px] bg-white/10 rounded-full overflow-hidden'>
	<div
		className='h-full rounded-full'
		style={{
			width: `${(valor / valorMaximo) * 100}%`,
			backgroundColor: corCategoria,
		}}
	/>
</div>
```

### 3. Ordenação por padrão

Ordenar cada lista (matérias-primas e intermediários) por quantidade decrescente por padrão. Adicionar um pequeno toggle no cabeçalho do painel: "Quantidade" / "Nome (A-Z)".

### 4. Cabeçalho com contagem

No topo de cada painel, junto do título, mostrar a contagem: `Matérias-primas necessárias · 9 itens`.

### 5. Zebra stripe sutil

Linhas alternadas com `bg-white/5` (dark) / `bg-black/[0.02]` (light) para facilitar o acompanhamento visual em listas longas. Padding vertical de 8px, `rounded-md` na linha inteira (não só no ícone).

### 6. Contraste dos números

Números em `font-weight: 500`, cor de texto primária (não secundária) — eles são o dado mais importante da linha, não deveriam ser mais apagados que o nome do item. Usar `font-variant-numeric: tabular-nums` para alinhamento correto.

### 7. Scroll interno em listas longas

Quando a lista de matérias-primas ou intermediários passar de ~12 itens, aplicar `max-height` (ex: 480px) com `overflow-y: auto` no painel, em vez de deixar a página inteira crescer.

### 8. Nome completo no carrinho

No item do carrinho, remover a truncagem agressiva: aumentar a largura do card ou quebrar em duas linhas se necessário. Adicionar `title={nomeCompleto}` como tooltip nativo enquanto isso não é resolvido.

### 9. Botão "copiar lista"

No fim de cada painel (matérias-primas / intermediários), um botão secundário "Copiar lista" que gera um texto tipo:

```
Minério Metálico x2.280
Carvão Mineral x1.824
Pedra x1.050
...
```

e copia para a área de transferência (`navigator.clipboard.writeText`). Mostrar um toast rápido "Lista copiada" após o clique.

## Prioridade

1. **P0** — Unificar ícones (1), contraste dos números (6), ordenação por quantidade (3)
2. **P1** — Barra de quantidade relativa (2), cabeçalho com contagem (4), zebra stripe (5)
3. **P2** — Scroll interno (7), nome completo no carrinho (8), botão copiar lista (9)
