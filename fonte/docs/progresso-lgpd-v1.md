# NG+ — LGPD: exclusão de conta e política de privacidade (progresso v1)

Atualizado em 06/11/2026.

## O que foi feito
- **Edge Function `delete-account`** (Supabase, projeto `gjoxrgnkwmjvcfiywtcs`, `verify_jwt = true`). Para o usuário logado que chama (e só ele): apaga os registros de `user_docs`, as fotos do bucket privado `fotos-progresso/<uid>/` e, por fim, o usuário de autenticação. Exige o corpo `{"confirmar":"EXCLUIR"}`. Código em `fonte/supabase/functions/delete-account/index.ts`.
- **Config → Conta**: botões "Política de privacidade" e "Excluir minha conta e dados". A exclusão tem duas confirmações (aviso com foco em "Cancelar"; depois digitar EXCLUIR). Sem internet, avisa e não faz nada. Em caso de sucesso apaga também os dados deste aparelho (bancos `bff*`, chaves locais) e volta ao login. Se falhar no meio, mostra o código do erro e orienta a tentar de novo.
- **Política de privacidade** em português simples (LGPD, Lei 13.709/2018), aberta pelo login e pela Config: quem é o responsável, dados coletados (inclui medidas, peso e fotos como dados sensíveis, tratados com consentimento), finalidade, onde ficam (aparelho, Supabase São Paulo; Cloudflare hospeda; Gmail envia o código), retenção, menores de 18, direitos do art. 18 e como exercê-los (exportar JSON, editar, excluir), segurança e aviso de saúde. O contato fica na constante `CONTATO_PRIVACIDADE` em `ng-nuvem.js` (hoje o e-mail do Gabriel).
- Link da política na tela de login ("Ao entrar, você concorda…").

## Testes
- `testes/lgpd.js` (18 checks, Supabase real com usuário descartável, criado e removido): política abre sobre o login; cancelar não apaga; botão só ativa com "excluir"; remove documentos + foto + usuário; aparelho limpo; login seguinte falha; sem erros de JS; axe nas 3 telas novas sem violações.
- Chamada direta da função: sem confirmação → 400; token anônimo → 401; com confirmação → ok (1 doc apagado). Dados do Gabriel (93 registros) intactos após todos os testes.
- Service worker: `ng-lgpd-1`; `ng-nuvem.js` versão "B2".

## Pendências / atenção
1. **Revisão jurídica**: a política é um texto em linguagem simples, não substitui um advogado. Vale revisar antes de abrir para mais pessoas (base legal, prazos, contato do encarregado).
2. Há 1 foto órfã de um usuário de teste antigo no bucket (`8fb646f3-…/db2b1ef3…`): apagar em Supabase → Storage → fotos-progresso (apagar por SQL deixaria o arquivo físico).
3. Backups do Supabase: dados apagados podem permanecer em backups internos do provedor por um período; mencionar se necessário na revisão jurídica.
4. Menores: o app já bloqueia metas agressivas; consentimento do responsável é orientação textual, não há verificação de idade.
