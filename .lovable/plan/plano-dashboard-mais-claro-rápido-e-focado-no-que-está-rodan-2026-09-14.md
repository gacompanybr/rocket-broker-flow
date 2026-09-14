# Plano — Dashboard mais claro, rápido e focado no que está rodando

## Objetivo
Transformar o painel em uma visão operacional simples: o cliente abre e identifica imediatamente quais campanhas estão ativas, quanto estão gastando e quais vídeos ou criativos estão sendo exibidos.

Hoje há **31 campanhas Meta registradas, mas somente 4 ativas**. A tela de Campanhas lista todas, e o sistema ainda não coleta anúncios e criativos individualmente.

## 1. Simplificar o Dashboard geral
- Manter no topo apenas os indicadores essenciais do período: investimento, leads, custo por lead, alcance e cliques.
- Criar a seção **“Em veiculação agora”**, mostrando somente campanhas Meta ativas por padrão.
- Em cada campanha ativa, exibir status, orçamento diário, gasto no período, leads e custo por lead.
- Incluir um controle discreto para consultar campanhas pausadas ou encerradas quando necessário, sem misturá-las à visão principal.
- Manter Google e Site como “Ainda não integrado”, sem valores simulados.

## 2. Mostrar vídeos e criativos dos anúncios
- Ampliar a sincronização Meta para buscar a estrutura campanha → conjunto → anúncio → criativo.
- Salvar apenas dados necessários para visualização: identificação, nomes, status efetivo, tipo do criativo, miniatura, texto principal, título e referência do vídeo/imagem.
- Exibir no Dashboard uma faixa de **“Criativos ativos”**, ligada somente às campanhas em veiculação.
- Ao abrir um criativo, mostrar uma prévia maior, campanha, conjunto, nome do anúncio, texto, formato e status.
- Para vídeos, buscar a fonte de reprodução atual somente quando o usuário abrir a prévia; o token da Meta continuará protegido no servidor.
- Usar carregamento gradual de imagens e placeholders para que miniaturas não atrasem o restante do painel.

## 3. Melhorar a tela de Campanhas
- Abrir a aba Meta já filtrada em **Ativas**.
- Adicionar filtros “Ativas”, “Pausadas” e “Todas”, além de busca por nome.
- No celular, trocar a tabela larga por uma lista compacta e legível; manter a tabela no computador.
- Ao abrir uma campanha, carregar sob demanda o histórico e a galeria dos anúncios/criativos relacionados.
- Preservar os controles administrativos já existentes para pausar, ativar e alterar orçamento.

## 4. Deixar a navegação mais rápida
- Substituir o carregamento de todo o histórico de métricas por resumos agregados por período e campanha.
- Buscar o histórico detalhado apenas quando uma campanha for aberta.
- Preparar os dados da próxima tela ao tocar ou passar sobre os itens do menu, aproveitando o cache já existente.
- Fazer o painel reutilizar dados recentes ao voltar de outra aba, atualizando em segundo plano sem bloquear a tela.
- Limitar as atualizações em tempo real às consultas que estiverem visíveis, evitando recarregamentos gerais repetidos.
- Consolidar as várias consultas do Dashboard em uma resposta resumida, reduzindo esperas e mudanças de layout.

## 5. Sincronização e consistência
- Continuar considerando somente campanhas criadas a partir de **30/06/2026**.
- Sincronizar campanhas e métricas como hoje, acrescentando anúncios e criativos ativos.
- Marcar anúncios que deixarem de existir ou de veicular, sem apagá-los imediatamente, para manter rastreabilidade.
- Atualizar campanhas/métricas a cada 5 minutos e criativos em uma frequência mais econômica, com atualização manual disponível ao administrador.
- Registrar sucessos e falhas da nova sincronização junto aos logs de integração existentes.

## 6. Segurança e acesso
- Fazer todas as chamadas à Meta pelo servidor, sem expor o token no navegador.
- Respeitar os mesmos acessos atuais: cada usuário verá somente campanhas permitidas pelas regras já existentes.
- Manter ações de alteração da Meta restritas ao administrador; owner e corretor terão visualização conforme suas permissões.

## 7. Validação
- Conferir os ativos exibidos no painel contra os status efetivos retornados pela conta Meta correta.
- Testar filtros de data e confirmar os totais do Dashboard contra as métricas armazenadas.
- Testar imagens, vídeos, estados sem criativo e links expirados.
- Medir a quantidade de chamadas e o tempo de troca entre Dashboard, Campanhas e Corretores.
- Validar visualmente em celular e computador, garantindo que textos, filtros e prévias não se sobreponham.

## Detalhes técnicos
- Criar estrutura no banco para anúncios/criativos com acesso protegido e atualização em tempo real apenas quando útil.
- Criar consultas resumidas por período para o Dashboard e por campanha para a listagem.
- Reaproveitar opções de consulta entre carregamento das páginas e componentes, com o cache controlando a atualização.
- Ajustar o tempo de pré-carregamento do roteador para que o cache de dados seja a fonte única de atualização.
