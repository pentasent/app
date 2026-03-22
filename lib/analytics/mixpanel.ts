import { Mixpanel } from "mixpanel-react-native";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

const trackAutomaticEvents = true;

let mixpanel: Mixpanel | null = null;

export const initMixpanel = async () => {
  // if (!isProduction) return;

  if (!mixpanel) {
    mixpanel = new Mixpanel(
      process.env.EXPO_PUBLIC_MIXPANEL_TOKEN as string,
      trackAutomaticEvents
    );

    // Set server URL for EU residents (matches web config)
    mixpanel.setServerURL("https://api-eu.mixpanel.com");
    
    await mixpanel.init();
  }
};

export const getMixpanel = () => mixpanel;