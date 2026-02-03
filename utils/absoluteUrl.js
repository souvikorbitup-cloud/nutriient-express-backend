export const makeAbsoluteUrl = (path) => {
  if (!path) return path;

  // Already absolute
  if (path.startsWith("http")) return path;

  return `${process.env.BASE_URL}${path}`;
};
