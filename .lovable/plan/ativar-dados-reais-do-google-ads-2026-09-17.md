# Ativar dados reais do Google Ads

## Objetivo
Substituir o aviso de integração pendente por campanhas e métricas reais da conta **OArco Gerenciamento Imobiliário (745-548-7545)**, sem usar ou misturar outras contas.

## Implementação
- Criar a sincronização segura no servidor usando a conexão Google Ads já vinculada.
- Importar campanhas e métricas diárias da conta selecionada para as estruturas já usadas pelo painel.
- Registrar sucessos e falhas no histórico de integrações e disponibilizar sincronização manual para administradores.
- Adicionar um endereço protegido para a sincronização automática periódica.
- Atualizar Dashboard, Campanhas e Configurações para identificar os dados reais do Google Ads.
- Manter Google Business Profile sem integração e sem dados simulados.

## Regras de dados
- Aceitar somente a conta `7455487545`.
- Evitar duplicações ao repetir a sincronização.
- Converter valores do Google de micros para reais.
- Usar conversões como leads e manter alcance como zero quando o Google não fornecer essa métrica.
- Preservar o filtro de datas já existente no painel.

## Validação
- Executar a primeira sincronização e conferir campanhas, gasto, impressões, cliques e conversões contra a conta conectada.
- Confirmar que a aba Google e o filtro Google do Dashboard mostram valores reais.
- Testar atualização manual e visualização em computador e celular.
