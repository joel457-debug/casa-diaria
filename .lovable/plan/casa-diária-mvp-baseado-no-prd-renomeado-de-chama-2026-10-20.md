# Casa Diária — MVP (baseado no PRD, renomeado de "Chama")

Marketplace de serviços locais em Gurupi/TO, pt-BR, BRL, identidade em tons de verde. O nome "Chama" do PRD passa a ser **Casa Diária** em toda a interface, logotipo e textos.

## Primeira entrega (MVP)

1. **Página inicial** — logotipo Casa Diária, busca, região (Gurupi), categorias, seções "Pequenos serviços", "Resolva isso hoje", profissionais disponíveis e bem avaliados.
2. **Busca e resultados** — filtros por categoria, disponibilidade e nota (removíveis individualmente); cartões com foto, nome, categoria, nota, nº de avaliações, indicador verde/laranja/vermelho, região, preço inicial.
3. **Perfil público do profissional** — URL estável (/profissional/nome), biografia até 3.000 caracteres, especialidades, portfólio de fotos, preços e condições, avaliações detalhadas (qualidade, pontualidade, atendimento, transparência), botões de orçamento, WhatsApp, Instagram e compartilhar.
4. **Contas** — cadastro/login por e-mail e Google; uma conta pode ser cliente e profissional.
5. **Cliente** — solicitar orçamento, Meus pedidos, Favoritos, confirmar conclusão e avaliar (somente após contratação concluída).
6. **Painel do profissional** — editar perfil, portfólio, preços, agenda por período (cores), responder pedidos e avaliações.
7. **Admin básico** — gerenciar categorias e moderar denúncias.

Fica para depois: planos pagos, destaques patrocinados, chat interno, vídeos, estatísticas avançadas.

## Visual
Verde como cor principal, fundos claros, laranja/vermelho só na disponibilidade; tipografia arredondada; logotipo em minúsculas "casa diária" com símbolo de casa + localização. Navegação inferior no celular.

## Detalhes técnicos
- Lovable Cloud: tabelas de perfis, papéis (tabela separada user_roles), categorias, profissionais, portfólio, pedidos, avaliações (vinculadas ao pedido concluído, uma por pedido), favoritos, disponibilidade, denúncias; RLS em todas.
- Armazenamento de fotos (avatar e portfólio).
- Dados de exemplo (categorias do PRD e alguns profissionais fictícios) inseridos na migração.
- Rotas TanStack separadas por página; head() próprio em cada uma.
