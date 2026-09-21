//Responsive:
import { useWindowDimensions } from "react-native";
import { TABLET_SCALE } from "../theme";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 700;
  const columns = isTablet ? 2 : 1;
  const maxContentWidth = isTablet ? 720 : width;
  return { width, height, isTablet, columns, maxContentWidth };
}

export function scale(size, isTablet) {
  return Math.round(size * (isTablet ? TABLET_SCALE : 1));
}