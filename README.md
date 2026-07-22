# Portal do Cliente PrevOS

Portal da Consertar Compressores para consulta de máquinas, ordens de serviço, peças utilizadas e relatórios em PDF.

## Teste local

1. Copie `.env.example` para `.env.local`.
2. Informe a URL de produção do webhook do n8n.
3. Execute:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000/?demo=1` para usar os dados demonstrativos.

## EasyPanel

1. Crie um serviço do tipo **App**.
2. Selecione este repositório do GitHub.
3. Use o método de build **Dockerfile** e o caminho `Dockerfile`.
4. Adicione a variável de ambiente:

```text
N8N_PORTAL_WEBHOOK_URL=https://n8n.seudominio.com/webhook/portal-cliente
```

5. Configure o domínio/proxy para a porta `3000`.
6. Faça o deploy.

## Acesso do cliente

```text
https://portal.seudominio.com.br/?token=TOKEN_EXCLUSIVO_DO_CLIENTE
```

O navegador chama `/api/portal`, e o servidor encaminha o token ao webhook configurado. A URL do n8n não fica exposta no código do navegador.

## Estrutura esperada do n8n

O webhook deve responder JSON com `cliente`, `maquinas`, `ordens` e `atualizado_em`. Cada ordem pode conter `pecas`, `pdf_url` e `nota_fiscal_url`.
