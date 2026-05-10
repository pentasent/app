import { getMixpanel } from "./mixpanel";
import { getFirebaseAnalytics } from "./firebase";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

export const identifyUser = async (
  userId: string,
  traits?: Record<string, any>
) => {
  if (!isProduction) return;

  const mixpanel = getMixpanel();
  const firebase = getFirebaseAnalytics();

  if (mixpanel) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.getPeople().set(traits);
    }
  }

  if (firebase) {
    await firebase.setUserId(userId);
    if (traits) {
      await firebase.setUserProperties(traits);
    }
  }
};