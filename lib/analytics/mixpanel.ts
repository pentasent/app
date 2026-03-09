import { Mixpanel } from "mixpanel-react-native";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

const trackAutomaticEvents = false;

let mixpanel: Mixpanel | null = null;

export const initMixpanel = async () => {
  if (!isProduction) return;

  if (!mixpanel) {
    mixpanel = new Mixpanel(
      process.env.EXPO_PUBLIC_MIXPANEL_TOKEN as string,
      trackAutomaticEvents
    );

    await mixpanel.init();
  }
};

export const getMixpanel = () => mixpanel;