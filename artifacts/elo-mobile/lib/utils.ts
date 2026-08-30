export function formatTimeAgo(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${Math.floor(diff / 86400)} d`;
  } catch (e) {
    return '';
  }
}

export function translatePostType(type: string) {
  switch (type) {
    case 'UPDATE':
      return 'Atualização';
    case 'PRAYER_REQUEST':
      return 'Motivo de Oração';
    case 'NEED':
      return 'Necessidade';
    default:
      return type;
  }
}
