---
name: supabase-ar-targets
description: Use esta skill quando precisarmos ajustar buscas no banco de dados, autenticação do painel admin, uploads para buckets ou colunas da tabela ar_targets.
---

# Estrutura do Supabase
Aqui estão as credenciais e o esquema do banco de dados para consultas e mutações:
- **Project ID (Local):** `cchnirqmxbudimjhlspe`
- **Project ID (Runtime):** `xeyfzhkualdchxedwkhz`
- **Chave Pública:** A chave pública está intencionalmente exposta em `ar.html` e `admin.html` para leitura pública.
- **Buckets de Armazenamento:** `targets` (imagens PNG de tracking) e `videos` (os overlays em MP4).
- **Esquema da Tabela `ar_targets`:**
  - `id`, `target_name`, `label`
  - `target_image_url`, `video_url`, `video_aspect`
  - `active` (boolean)
  - `target_properties` (metadados de crop/tamanho para o 8th Wall)
