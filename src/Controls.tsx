import { defaultControls } from './controlsConfig';

export const useLevaControls = () => {
  // Return static controls from the JS config file
  const controls = defaultControls;

  return {
    controls,
    controlsAPI: null, // No API needed since we're not using Leva UI
    lang: null, // No language support needed
    levaGlobal: null, // No Leva UI
  };
};
