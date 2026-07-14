export interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image: any;
}

export const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: "1",
    title: "IT Services In One App",
    description:
      "Find and book trusted IT related services near you in just a few taps away",
    image: require("../src/assets/onboarding1.png"),
  },
  {
    id: "2",
    title: "Book & Track Services",
    description: "Schedule instantly and follow every step in real time",
    image: require("../src/assets/onboarding2.png"),
  },
  {
    id: "3",
    title: "Secure & Transparent",
    description: "Verified technicians and 24/7 support for peace of mind",
    image: require("../src/assets/onboarding3.png"),
  },
];
