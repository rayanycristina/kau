# KAU v4.2.38 — Dependency Lock Fix

## Correção
Esta versão estabiliza as dependências do projeto para evitar erro de build no Windows envolvendo `framer-motion` e `motion-dom`:

`Attempted import error: setDragLock is not exported from motion-dom`

## O que mudou
- `next` foi fixado em `15.5.5`
- `react` foi fixado em `19.1.1`
- `react-dom` foi fixado em `19.1.1`
- `framer-motion` foi fixado em `12.23.24`
- `motion-dom` foi adicionado e fixado em `12.23.24`
- foi adicionado `overrides.motion-dom` para impedir instalação de versão incompatível

## Instalação recomendada
No Windows, antes de rodar novamente:

```bat
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npm run dev
```

Se `package-lock.json` não existir, ignore o erro do comando `del`.
