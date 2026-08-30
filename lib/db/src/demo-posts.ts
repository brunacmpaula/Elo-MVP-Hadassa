import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type DemoPostMedia = {
  id: string;
  clientMediaId: string;
  uri: string;
  thumbnailUri: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

export type DemoPostSeed = {
  id: string;
  clientOperationId: string;
  missionaryId: string;
  missionaryName: string;
  missionaryCountry: string;
  type: "UPDATE" | "PRAYER_REQUEST" | "NEED";
  title: string;
  content: string;
  status: "DRAFT" | "PENDING_SYNC" | "PUBLISHED" | "SYNC_FAILED";
  createdAt: Date;
  updatedAt: Date;
  prayerCount: number;
  media: DemoPostMedia[];
  comments: never[];
};

const demoImagePath = fileURLToPath(
  new URL(
    "../../../attached_assets/image_1788066801613.png",
    import.meta.url,
  ),
);
const demoImageBytes = readFileSync(demoImagePath);
const demoImageUri = `data:image/png;base64,${demoImageBytes.toString("base64")}`;
const demoThumbnailUri =
  "data:image/jpeg;base64,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";

export function getDemoPostSeeds(now = new Date()): DemoPostSeed[] {
  const needCreatedAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const updateCreatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  return [
    {
      id: "post-community-kits",
      clientOperationId: "seed-post-community-kits",
      missionaryId: "missionary-ana",
      missionaryName: "Ana Silva",
      missionaryCountry: "Moçambique",
      type: "NEED",
      title: "Kits de cuidado para novas famílias",
      content:
        "Precisamos de pessoas disponíveis para conversar sobre formas de apoiar a montagem e a entrega dos próximos kits.",
      status: "PUBLISHED",
      createdAt: needCreatedAt,
      updatedAt: needCreatedAt,
      prayerCount: 7,
      media: [],
      comments: [],
    },
    {
      id: "post-prayer-team",
      clientOperationId: "seed-post-prayer-team",
      missionaryId: "missionary-ana",
      missionaryName: "Ana Silva",
      missionaryCountry: "Moçambique",
      type: "PRAYER_REQUEST",
      title: "Ore pela nossa equipe esta semana",
      content:
        "Estamos visitando novas comunidades e precisamos de sabedoria, saúde e boas conversas em cada encontro.",
      status: "PUBLISHED",
      createdAt: needCreatedAt,
      updatedAt: needCreatedAt,
      prayerCount: 42,
      media: [],
      comments: [],
    },
    {
      id: "post-school",
      clientOperationId: "seed-post-school",
      missionaryId: "missionary-joao",
      missionaryName: "João Santos",
      missionaryCountry: "Brasil",
      type: "UPDATE",
      title: "Uma nova turma começou",
      content:
        "Recebemos doze alunos para um novo ciclo de acompanhamento. Obrigado por caminhar conosco.",
      status: "PUBLISHED",
      createdAt: needCreatedAt,
      updatedAt: needCreatedAt,
      prayerCount: 18,
      media: [],
      comments: [],
    },
    {
      id: "post-reading-room",
      clientOperationId: "seed-post-reading-room",
      missionaryId: "missionary-joao",
      missionaryName: "João Santos",
      missionaryCountry: "Brasil",
      type: "UPDATE",
      title: "A sala de leitura ganhou vida",
      content:
        "Hoje reunimos as crianças para a primeira roda de leitura na nova sala comunitária. Obrigado por fazer parte desta história.",
      status: "PUBLISHED",
      createdAt: updateCreatedAt,
      updatedAt: updateCreatedAt,
      prayerCount: 26,
      media: [
        {
          id: "media-demo-reading-room",
          clientMediaId: "demo-reading-room",
          uri: demoImageUri,
          thumbnailUri: demoThumbnailUri,
          mimeType: "image/png",
          sizeBytes: demoImageBytes.byteLength,
          width: 684,
          height: 666,
        },
      ],
      comments: [],
    },
    {
      id: "post-community-garden",
      clientOperationId: "seed-post-community-garden",
      missionaryId: "missionary-lucia",
      missionaryName: "Lúcia Nascimento",
      missionaryCountry: "Peru",
      type: "NEED",
      title: "Mãos para a horta comunitária",
      content:
        "Estamos organizando uma horta para as famílias ribeirinhas e precisamos de ajuda para preparar o primeiro canteiro.",
      status: "PUBLISHED",
      createdAt: updateCreatedAt,
      updatedAt: updateCreatedAt,
      prayerCount: 13,
      media: [],
      comments: [],
    },
  ];
}