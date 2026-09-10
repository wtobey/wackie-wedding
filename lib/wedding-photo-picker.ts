// Shuffle without replacement so random streaks cannot crowd out other photos.
export function createPhotoPicker<T extends { id: string }>(photos: readonly T[], random = Math.random) {
  let remaining: T[] = [];
  let previousId: string | undefined;
  return (): T | null => {
    if (!photos.length) return null;
    if (!remaining.length) {
      remaining = [...photos];
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      const last = remaining.length - 1;
      if (last > 0 && remaining[last].id === previousId) {
        [remaining[0], remaining[last]] = [remaining[last], remaining[0]];
      }
    }
    const photo = remaining.pop()!;
    previousId = photo.id;
    return photo;
  };
}
