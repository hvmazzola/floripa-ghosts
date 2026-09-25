# Floripa Ghosts — Central de treino

Aplicação local de demonstração para organizar elenco, treinos, convocações,
confirmações e presenças do Floripa Ghosts.

## Estrutura

- `src/app`: rota principal, layout e fundação visual global.
- `src/components/ui`: componentes reutilizáveis baseados no padrão do shadcn.
- `src/domain`: regras e tipos de negócio, sem dependência de interface.
- `src/lib`: utilitários compartilhados.
- `tests`: testes das regras de domínio.

A interface usa Tailwind CSS. O arquivo `src/app/globals.css` contém somente
fundação global, tokens e estilos semânticos compartilhados; ele não contém
sobrescritas históricas nem integração com DaisyUI.

## Desenvolvimento

```bash
npm run dev -- --port 3002
npm run typecheck
npm test
npm run build
npm run format:check
```

Os dados da demonstração são guardados no armazenamento local do navegador.
