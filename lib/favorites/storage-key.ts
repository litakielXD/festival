export function festivalFavoritesStorageKey(festivalId: string, userId: string) {
  return `festival:favorites:${festivalId}:${userId}`;
}
