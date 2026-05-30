# KAU V3.1.1 - Build fix

Correcoes aplicadas:

- `src/app/settings/page.tsx` agora e Client Component para permitir uso direto de icones Lucide em `ModuleHero` e `IntelligenceCard`.
- Corrigido erro de build do Next.js: `Functions cannot be passed directly to Client Components` em `/settings`.
- Removido import nao usado `ShieldAlert` em `src/shell/ai-copilot.tsx`.
- Revisados imports de `QueueRow` para evitar warnings/erros.

Como rodar em producao:

```bash
npm install
npm run build
npm run start
```

Se `npm run build` falhar, nao rode `npm run start`, porque o `.next/prerender-manifest.json` so existe depois de build concluido.
