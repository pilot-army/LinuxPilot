/**
 * Maps a message tree to its key structure, ignoring translated leaf values.
 * Used to compare locale files at compile time.
 */
export type MessageKeyTree<T> = {
  [K in keyof T]-?: T[K] extends Record<string, unknown> ? MessageKeyTree<T[K]> : true;
};

export type ExactEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export type Assert<T extends true> = T;
