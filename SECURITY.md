# Configuração e resposta à exposição de credenciais

Em 22/10/2026 foram removidas as senhas padrão administrativas e a conexão local
com credenciais fixas do código e do README. O `.env.example` usa valores fictícios
e campos de senha vazios. `DATABASE_URL` é obrigatória. `ADMIN_PASSWORD` é exigida
apenas ao criar o primeiro administrador, preservando usuários já existentes.

Os arquivos de ambiente e chaves locais são ignorados pelo Git e pelo build Docker,
inclusive em subdiretórios. Não inclua segredos nos pacotes de entrega.

A rotação autorizada da conta administrativa e do PostgreSQL já foi executada em
produção, com teste de login e conexão; as sessões antigas foram invalidadas.
As credenciais são administradas fora do repositório. A troca do ambiente não altera,
sozinha, a senha de um usuário já persistido ou de um banco com volume inicializado.

Testes locais: `node --test server/test/security-config.test.js`.

O histórico das branches publicadas foi saneado após autorização do proprietário. Clones anteriores
devem ser substituídos ou reconciliados antes de qualquer push para não reintroduzir
os valores antigos. Cópias de terceiros, caches e referências de pull requests podem
exigir providências adicionais junto aos respectivos responsáveis.
