// import { Mixpanel } from "mixpanel-react-native";

const isProduction = process.env.EXPO_PUBLIC_APP_ENV === "production";

const trackAutomaticEvents = true;

let mixpanel: any = null;

export const initMixpanel = async () => {
  /*
  const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    console.warn("Mixpanel Token missing, analytics disabled.");
    return;
  }

  try {
    if (!mixpanel) {
      mixpanel = new Mixpanel(token, trackAutomaticEvents);

      // Set server URL for EU residents (matches web config)
      mixpanel.setServerURL("https://api-eu.mixpanel.com");
      
      await mixpanel.init();
      console.log("Mixpanel initialized successfully (JS Fallback active if native missing)");
    }
  } catch (error) {
    console.error("Failed to initialize Mixpanel:", error);
  }
  */
  console.log("Mixpanel disabled for debugging Realtime issues.");
};

export const getMixpanel = () => mixpanel;