import { getMixpanel } from "./mixpanel";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

export const identifyUser = async (
  userId: string,
  traits?: Record<string, any>
) => {
  if (!isProduction) return;

  const mixpanel = getMixpanel();

  if (!mixpanel) return;

  mixpanel.identify(userId);

  if (traits) {
    mixpanel.getPeople().set(traits);
  }
};