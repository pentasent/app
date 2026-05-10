import { getMixpanel } from "./mixpanel";
import { getFirebaseAnalytics } from "./firebase";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

export const trackEvent = async (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (!isProduction) return;

  const mixpanel = getMixpanel();
  const firebase = getFirebaseAnalytics();

  if (mixpanel) {
    mixpanel.track(eventName, {
      platform: "mobile",
      ...properties,
    });
  }

  if (firebase) {
    await firebase.logEvent(eventName, {
      platform: "mobile",
      ...properties,
    });
  }
};