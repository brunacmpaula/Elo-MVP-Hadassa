# Fluxo nativo do seletor de imagens

Esta suíte usa [Maestro](https://maestro.mobile.dev/) para validar a
integração real entre o Elo, o seletor de imagens do sistema e a sincronização
da publicação. Ela é intencionalmente separada dos testes web e dos contratos
estáticos porque precisa de um emulador Android ou de um simulador iOS.

## Pré-requisitos

- Maestro instalado e disponível no `PATH`;
- uma build nativa do Elo instalada no dispositivo;
- um emulador Android ou simulador iOS inicializado;
- a API do Elo disponível no endereço configurado para a build.

Os fluxos usam o identificador nativo `com.elo.mobile`, configurado no
`app.json`. Para testar uma build diferente, informe `ELO_APP_ID`.

## Executar

```bash
# Android
ELO_APP_ID=com.elo.mobile pnpm --filter @workspace/elo-mobile run test:native:image-picker -- android

# iOS Simulator
ELO_APP_ID=com.elo.mobile pnpm --filter @workspace/elo-mobile run test:native:image-picker -- ios
```

O launcher copia cinco cópias nomeadas do ícone do Elo para a galeria do
emulador/simulador antes do fluxo. Use um dispositivo de teste dedicado:
as cópias são adicionadas à biblioteca do sistema e não são removidas
automaticamente. O runner falha com uma mensagem explícita se não houver
`adb`, `xcrun`, um dispositivo ativo, ou `maestro`.

## O que o fluxo confirma

1. seleciona uma imagem e exibe exatamente uma prévia;
2. seleciona quatro imagens e rejeita a quinta tentativa, mantendo quatro
   prévias;
3. troca entre Atualização, Oração e Necessidade e confirma que as imagens
   desaparecem quando o tipo deixa de ser Atualização;
4. salva uma publicação com imagem e outra sem imagem, confirmando a presença
   visual da mídia e dos dois títulos no feed.

O payload HTTP é coberto em conjunto pelo teste de integração do API server,
que verifica `media` com imagem e `media: []` sem imagem. Assim, o fluxo nativo
confirma a origem no seletor e o teste de API confirma o contrato enviado.