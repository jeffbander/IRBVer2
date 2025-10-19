export const daysFromNow = (offset: number) => {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return now;
};
