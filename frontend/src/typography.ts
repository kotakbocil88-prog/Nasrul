// Font families registered in app/_layout.tsx via expo-font.
// Space Grotesk = display headers, JetBrains Mono = body / data / labels.
export const fonts = {
  display: "SpaceGrotesk-Bold",
  displayMedium: "SpaceGrotesk-Medium",
  body: "JetBrainsMono-Regular",
  bodyMedium: "JetBrainsMono-Medium",
  bodyBold: "JetBrainsMono-Bold",
};

export const fontAssets = {
  "SpaceGrotesk-Bold": require("../assets/fonts/SpaceGrotesk-Bold.ttf"),
  "SpaceGrotesk-Medium": require("../assets/fonts/SpaceGrotesk-Medium.ttf"),
  "JetBrainsMono-Regular": require("../assets/fonts/JetBrainsMono-Regular.ttf"),
  "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  "JetBrainsMono-Bold": require("../assets/fonts/JetBrainsMono-Bold.ttf"),
};
