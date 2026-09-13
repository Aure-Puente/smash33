//Responsive:
import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 700;
  const columns = isTablet ? 2 : 1;
  const maxContentWidth = isTablet ? 720 : width;
  return { width, height, isTablet, columns, maxContentWidth };
}
