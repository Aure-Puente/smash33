//Responsive:
import { Dimensions, useWindowDimensions } from "react-native";
import { TABLET_SCALE } from "../theme";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 700;
  const columns = isTablet ? 2 : 1;
  const maxContentWidth = isTablet ? 720 : width;
  return { width, height, isTablet, columns, maxContentWidth };
}

const { width: STATIC_DEVICE_WIDTH } = Dimensions.get("window");
const STATIC_IS_TABLET = STATIC_DEVICE_WIDTH >= 700;

export function scale(size) {
  return Math.round(size * (STATIC_IS_TABLET ? TABLET_SCALE : 1));
}
export const IS_TABLET = STATIC_IS_TABLET;