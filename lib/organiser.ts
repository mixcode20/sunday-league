import "server-only";

export const isOrganiserPinConfigured = () =>
  Boolean(process.env.ORGANISER_PIN);

export const verifyOrganiserPin = (pin?: string) => {
  const expected = process.env.ORGANISER_PIN;
  if (!expected) {
    return false;
  }
  return pin === expected;
};
