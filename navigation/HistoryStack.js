//HistoryStack:
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HistoryScreen from "../screens/history/HistoryScreen";
import TournamentDetailScreen from "../screens/tournaments/TournamentDetailScreen";

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
    </Stack.Navigator>
  );
}
