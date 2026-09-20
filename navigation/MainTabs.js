//MainTabs
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeStack from "./HomeStack";
import TournamentsStack from "./TournamentsStack";
import StatsScreen from "../screens/stats/StatsScreen";
import HistoryStack from "./HistoryStack";
import MoreStack from "./MoreStack";
import AnimatedTabBar from "../components/AnimatedTabBar";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="Inicio" component={HomeStack} />
      <Tab.Screen name="Estadisticas" component={StatsScreen} />
      <Tab.Screen name="Torneo" component={TournamentsStack} />
      <Tab.Screen name="Historial" component={HistoryStack} />
      <Tab.Screen
        name="Mas"
        component={MoreStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Mas", { screen: "MoreHome" });
          },
        })}
      />
    </Tab.Navigator>
  );
}