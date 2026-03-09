import { getMixpanel } from "./mixpanel";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

export const trackEvent = async (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (!isProduction) return;

  const mixpanel = getMixpanel();

  if (!mixpanel) return;

  mixpanel.track(eventName, {
    platform: "mobile",
    ...properties,
  });
};