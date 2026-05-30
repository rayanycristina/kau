# KAU v4.2.41 — NPM Motion DOM Fix

## Correção
Removido o pin direto de `motion-dom@12.23.24` e o `overrides` correspondente, porque essa versão não existe no registry do npm e quebrava o `npm install` com `ETARGET No matching version found`.

## Mantido
- Meta Engine preservada
- Supabase preservado
- cálculos preservados
- Next/React/Framer Motion mantidos no package.json

## Como instalar limpo no Windows
Dentro da pasta do projeto:

```bat
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npm run dev
```

Se `node_modules` ou `package-lock.json` não existir, ignore o aviso.
