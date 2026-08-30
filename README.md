# Elo

**Mesmo longe, juntos na missão.**

O Elo conecta missionários e apoiadores. Missionários registram atualizações,
pedidos de oração e necessidades mesmo quando estão sem internet. Apoiadores
descobrem missionários, acompanham suas publicações e marcam que estão orando.

## Fluxo principal do MVP

1. Entre na experiência de **missionário**.
2. Ative **Simular modo offline**.
3. Crie um pedido de oração.
4. O conteúdo é salvo localmente como `PENDING_SYNC` e uma operação idempotente
   entra na fila.
5. Desative o modo offline.
6. O mecanismo tenta sincronizar, aguarda a confirmação e então marca a
   publicação como `PUBLISHED`.
7. Troque para a experiência de **apoiador**, abra a publicação e toque em
   **Estou orando**.

## Arquitetura

```text
Expo / React Native
        |
        v
Telas e componentes
        |
        v
Contextos e serviços de aplicação
        |
        v
Repositório local + fila de operações
        |                         |
        +-------- Sync ----------+
                    |
                    v
            REST API /api
                    |
                    v
          armazenamento do servidor
```

O armazenamento local é a fonte imediata da experiência do missionário. Uma
publicação criada offline não depende da API para aparecer na interface. A fila
mantém `operationId`, entidade, operação, payload, data, estado e tentativas.
Operações só são consideradas concluídas após um ACK do servidor. O endpoint de
sincronização guarda os identificadores processados para que reenvios não criem
duplicações.

No preview web do MVP, o adaptador local usa AsyncStorage, que mantém o mesmo
contrato de repositório usado pelo mecanismo offline. Isso permite demonstrar o
fluxo completo no navegador e no Expo Go.

## Stack do projeto

- Mobile: React Native, TypeScript, Expo, Expo Router
- Estado local: Context API e armazenamento persistente local
- Estado de servidor: TanStack Query e cliente gerado por OpenAPI
- Backend: Express, TypeScript e Zod
- Contrato: OpenAPI com geração automática do cliente e validadores

## Como executar

No Replit, use os workflows:

- `artifacts/elo-mobile: expo`
- `artifacts/api-server: API Server`

Comandos úteis:

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/elo-mobile run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm run typecheck
```

## API

O contrato está em `lib/api-spec/openapi.yaml`. Os principais endpoints são:

- `POST /api/auth/login`
- `GET /api/missionaries`
- `GET /api/missionaries/{id}`
- `POST|DELETE /api/missionaries/{id}/follow`
- `GET|POST /api/posts`
- `GET|PATCH /api/posts/{id}`
- `POST|DELETE /api/posts/{id}/prayers`
- `POST /api/sync`

## Decisões do MVP

- Um único app oferece as experiências de missionário e apoiador.
- O modo offline pode ser simulado dentro do app para tornar a demonstração
  reproduzível.
- O servidor é um monólito modular e a sincronização é idempotente.
- A interface sempre mostra texto e ícone para o estado de sincronização, sem
  depender apenas de cor.

## Limitações

- A entrada usa perfis de demonstração; cadastro institucional de missionários
  e autenticação de produção ficam fora desta primeira entrega.
- O adaptador local do preview usa AsyncStorage. A interface de repositório foi
  separada para permitir a adoção de SQLite nativo sem alterar as telas.
- A persistência do servidor desta demonstração está em memória.
- Pagamentos, PIX, chat, organizações, mapa, vídeos, IA e notificações complexas
  não fazem parte do MVP.

## Próximos passos

- Persistência PostgreSQL e migrações.
- Adaptador SQLite nativo com migração de esquema.
- Autenticação institucional e convites emitidos por igrejas.
- Testes automatizados do mecanismo offline, idempotência, follow e oração.