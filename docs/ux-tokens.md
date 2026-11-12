# Tokens de interface

Novos componentes usam os aliases semânticos existentes: --bg, --panel, --raised, --line, --text, --soft, --muted e --emerald. As fronteiras de controles e o foco usam --control-border e --focus-ring por tema.

color-tokens.css centraliza as primitivas de compatibilidade extraídas dos estilos existentes, organizadas em famílias neutral, green, blue, warm, accent, overlay e art. A extração mantém o valor renderizado para preservar a identidade. Isso elimina as cores fixas nos componentes sem substituir a paleta existente por outra.

visual-colors.ts oferece constantes para ilustrações, gráficos e materiais WebGL, que precisam de valores de cor aceitos por seus renderizadores. Não use essas constantes para superfícies novas da interface; use os aliases semânticos do tema.

check:tokens analisa declarações CSS e literais TS/TSX. Apenas os quatro arquivos de paleta/tema declarados no script aceitam cores fixas. A classe text-emerald é semântica e resolve para var(--emerald); classes de paletas fixas, por exemplo bg-blue-500, são rejeitadas. test-tokens.mjs verifica a rejeição com um arquivo temporário que é removido no finally.

migrate-color-tokens.mjs é uma migração única, com bloqueio contra reexecução que sobrescreveria a paleta. O relatório gerado está em output/ux-token-migration.json. Novos ajustes devem ser manuais e semânticos. A migração não altera atributos da árvore nem os ativos originais da marca.
