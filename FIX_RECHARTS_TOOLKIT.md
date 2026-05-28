# KAU v4.2.76 - Recharts Toolkit Dependency Fix

## Correção
Adicionada a dependência `@reduxjs/toolkit` ao `package.json`.

## Motivo
O build do Next estava quebrando porque o pacote `recharts` importava `@reduxjs/toolkit`, mas essa dependência não estava declarada no projeto.

Erro corrigido:

```txt
Module not found: Can't resolve '@reduxjs/toolkit'
```

## Como aplicar no Windows
Depois de extrair este ZIP, rode:

```bat
rmdir /s /q node_modules
npm cache clean --force
npm install
npm run dev
```

Se o Windows informar que `node_modules` não existe, ignore e continue.
